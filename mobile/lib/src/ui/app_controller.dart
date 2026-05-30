import 'package:flutter/foundation.dart';

import '../api/shiftplan_api_client.dart';
import '../models/api_models.dart';
import 'iso_week.dart';

enum AuthStatus { checking, signedOut, signedIn }

class AppController extends ChangeNotifier {
  AppController({required this.api}) {
    final currentWeek = IsoWeek.current();
    selectedYear = currentWeek.year;
    selectedWeek = currentWeek.week;
  }

  final ShiftplanApiClient api;

  AuthStatus authStatus = AuthStatus.checking;
  SessionUser? user;
  WeeklyShiftplan? currentPlan;
  List<Staff> staff = const [];
  bool busy = false;
  String? errorMessage;
  late int selectedYear;
  late int selectedWeek;

  Future<void> bootstrap() async {
    await _run(() async {
      final session = await api.getSession();
      user = session.user;
      authStatus =
          session.authenticated ? AuthStatus.signedIn : AuthStatus.signedOut;
      if (session.authenticated) {
        await loadCurrentWeek();
      }
    }, fallbackStatus: AuthStatus.signedOut);
  }

  Future<void> login(String username, String password) async {
    await _run(() async {
      final login = await api.login(username: username, password: password);
      user = login.user;
      authStatus = AuthStatus.signedIn;
      await loadCurrentWeek();
    });
  }

  Future<void> logout() async {
    await _run(() async {
      await api.logout();
      user = null;
      currentPlan = null;
      staff = const [];
      authStatus = AuthStatus.signedOut;
    });
  }

  Future<void> loadCurrentWeek() async {
    staff = await api.listStaff();
    currentPlan = await api.getWeeklyPlan(
      year: selectedYear,
      week: selectedWeek,
    );
    notifyListeners();
  }

  Future<void> refreshCurrentWeek() => _run(loadCurrentWeek);

  Future<void> nextWeek() async {
    final next = IsoWeek(year: selectedYear, week: selectedWeek).next();
    selectedYear = next.year;
    selectedWeek = next.week;
    await _run(loadCurrentWeek);
  }

  Future<void> previousWeek() async {
    final previous = IsoWeek(year: selectedYear, week: selectedWeek).previous();
    selectedYear = previous.year;
    selectedWeek = previous.week;
    await _run(loadCurrentWeek);
  }

  Future<void> assignStaff({
    required int shiftId,
    required int staffId,
  }) async {
    await _run(() async {
      await api.assignStaff(
        staffId: staffId,
        shiftId: shiftId,
        year: selectedYear,
        week: selectedWeek,
      );
      await loadCurrentWeek();
    });
  }

  Future<void> unassignStaff({
    required int shiftId,
    required int staffId,
  }) async {
    await _run(() async {
      await api.unassignStaff(
        staffId: staffId,
        shiftId: shiftId,
        year: selectedYear,
        week: selectedWeek,
      );
      await loadCurrentWeek();
    });
  }

  Future<void> _run(
    Future<void> Function() action, {
    AuthStatus? fallbackStatus,
  }) async {
    busy = true;
    errorMessage = null;
    notifyListeners();

    try {
      await action();
    } on ShiftplanApiException catch (error) {
      errorMessage = error.message;
      if (error.statusCode == 401) {
        await api.clearToken();
        user = null;
        currentPlan = null;
        authStatus = AuthStatus.signedOut;
      } else if (fallbackStatus != null) {
        authStatus = fallbackStatus;
      }
    } catch (_) {
      errorMessage = 'Verbindung fehlgeschlagen';
      if (fallbackStatus != null) {
        authStatus = fallbackStatus;
      }
    } finally {
      busy = false;
      notifyListeners();
    }
  }
}
