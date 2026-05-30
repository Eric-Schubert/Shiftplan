import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class TokenStore {
  Future<String?> readSessionToken();
  Future<void> writeSessionToken(String token);
  Future<void> clearSessionToken();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore({
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage();

  static const _sessionTokenKey = 'shiftplan.sessionToken';

  final FlutterSecureStorage _storage;

  @override
  Future<String?> readSessionToken() {
    return _storage.read(key: _sessionTokenKey);
  }

  @override
  Future<void> writeSessionToken(String token) {
    return _storage.write(key: _sessionTokenKey, value: token);
  }

  @override
  Future<void> clearSessionToken() {
    return _storage.delete(key: _sessionTokenKey);
  }
}

class MemoryTokenStore implements TokenStore {
  String? _token;

  @override
  Future<String?> readSessionToken() async => _token;

  @override
  Future<void> writeSessionToken(String token) async {
    _token = token;
  }

  @override
  Future<void> clearSessionToken() async {
    _token = null;
  }
}
