import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/api_models.dart';
import '../storage/token_store.dart';

class ShiftplanApiException implements Exception {
  const ShiftplanApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'ShiftplanApiException($statusCode): $message';
}

class ShiftplanApiClient {
  ShiftplanApiClient({
    required this.baseUri,
    required this.tokenStore,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final Uri baseUri;
  final TokenStore tokenStore;
  final http.Client _http;

  String? _sessionToken;

  Future<void> restoreToken() async {
    _sessionToken = await tokenStore.readSessionToken();
  }

  Future<TokenLoginResponse> login({
    required String username,
    required String password,
  }) async {
    final json = await _requestJson(
      'POST',
      '/api/auth/login',
      body: {
        'username': username,
        'password': password,
        'responseMode': 'token',
      },
      authenticated: false,
    );
    final login = TokenLoginResponse.fromJson(json);
    _sessionToken = login.sessionToken;
    await tokenStore.writeSessionToken(login.sessionToken);
    return login;
  }

  Future<AuthSession> getSession() async {
    await restoreToken();
    final json = await _requestJson(
      'GET',
      '/api/auth/session',
      authenticated: _sessionToken != null,
    );
    final session = AuthSession.fromJson(json);
    if (!session.authenticated) {
      await clearToken();
    }
    return session;
  }

  Future<void> logout() async {
    await restoreToken();
    if (_sessionToken != null) {
      await _requestJson('POST', '/api/auth/logout');
    }
    await clearToken();
  }

  Future<List<Staff>> listStaff() async {
    final json = await _requestJson('GET', '/api/staff');
    return (json as List<dynamic>)
        .map((staff) => Staff.fromJson(staff as Map<String, dynamic>))
        .toList();
  }

  Future<WeeklyShiftplan> getWeeklyPlan({
    required int year,
    required int week,
  }) async {
    final json = await _requestJson(
      'GET',
      '/api/shiftplan',
      query: {
        'year': '$year',
        'week': '$week',
      },
    );
    return WeeklyShiftplan.fromJson(json);
  }

  Future<bool> assignStaff({
    required int staffId,
    required int shiftId,
    required int year,
    required int week,
  }) async {
    final json = await _requestJson(
      'POST',
      '/api/shiftplan/assign',
      body: {
        'staff_id': staffId,
        'shift_id': shiftId,
        'year': year,
        'week': week,
      },
    );
    return json['success'] as bool;
  }

  Future<bool> unassignStaff({
    required int staffId,
    required int shiftId,
    required int year,
    required int week,
  }) async {
    final json = await _requestJson(
      'POST',
      '/api/shiftplan/unassign',
      body: {
        'staff_id': staffId,
        'shift_id': shiftId,
        'year': year,
        'week': week,
      },
    );
    return json['success'] as bool;
  }

  Future<void> clearToken() async {
    _sessionToken = null;
    await tokenStore.clearSessionToken();
  }

  Future<dynamic> _requestJson(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    bool authenticated = true,
  }) async {
    final request = http.Request(method, _buildUri(path, query));
    request.headers['accept'] = 'application/json';

    if (body != null) {
      request.headers['content-type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    if (authenticated) {
      await restoreToken();
      final token = _sessionToken;
      if (token != null) {
        request.headers['authorization'] = 'Bearer $token';
      }
    }

    final streamed = await _http.send(request);
    final response = await http.Response.fromStream(streamed);
    return _decodeResponse(response);
  }

  Uri _buildUri(String path, Map<String, String>? query) {
    final basePath = baseUri.path.endsWith('/')
        ? baseUri.path
        : '${baseUri.path}/';
    final normalizedBase = baseUri.replace(path: basePath);
    final relativePath = path.startsWith('/') ? path.substring(1) : path;
    final uri = normalizedBase.resolve(relativePath);
    return query == null || query.isEmpty
        ? uri
        : uri.replace(queryParameters: query);
  }

  dynamic _decodeResponse(http.Response response) {
    final body = response.body.trim();
    final decoded = body.isEmpty ? null : jsonDecode(body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final message = decoded is Map<String, dynamic>
        ? decoded['statusMessage'] as String? ??
            decoded['message'] as String? ??
            'Request failed'
        : 'Request failed';

    throw ShiftplanApiException(response.statusCode, message);
  }
}
