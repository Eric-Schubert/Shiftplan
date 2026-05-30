class SessionUser {
  const SessionUser({
    required this.userId,
    required this.username,
    required this.role,
  });

  final int userId;
  final String username;
  final String role;

  factory SessionUser.fromJson(Map<String, dynamic> json) {
    return SessionUser(
      userId: json['userId'] as int,
      username: json['username'] as String,
      role: json['role'] as String,
    );
  }
}

class TokenLoginResponse {
  const TokenLoginResponse({
    required this.user,
    required this.sessionToken,
    required this.expiresAt,
  });

  final SessionUser user;
  final String sessionToken;
  final DateTime expiresAt;

  factory TokenLoginResponse.fromJson(Map<String, dynamic> json) {
    return TokenLoginResponse(
      user: SessionUser.fromJson(json['user'] as Map<String, dynamic>),
      sessionToken: json['sessionToken'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );
  }
}

class AuthSession {
  const AuthSession({
    required this.authenticated,
    this.user,
  });

  final bool authenticated;
  final SessionUser? user;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final authenticated = json['authenticated'] as bool;
    return AuthSession(
      authenticated: authenticated,
      user: authenticated
          ? SessionUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
    );
  }
}

class Staff {
  const Staff({
    required this.staffId,
    required this.name,
    required this.active,
    required this.isParttime,
  });

  final int staffId;
  final String name;
  final int active;
  final int isParttime;

  bool get isActive => active == 1;

  factory Staff.fromJson(Map<String, dynamic> json) {
    return Staff(
      staffId: json['staff_id'] as int,
      name: json['name'] as String,
      active: json['active'] as int,
      isParttime: json['is_parttime'] as int,
    );
  }
}

class Shift {
  const Shift({
    required this.shiftId,
    required this.name,
    required this.active,
    required this.startTime,
    required this.endTime,
    required this.color,
    required this.minStaff,
    required this.sortOrder,
  });

  final int shiftId;
  final String name;
  final int active;
  final String startTime;
  final String endTime;
  final String color;
  final int minStaff;
  final int sortOrder;

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      shiftId: json['shift_id'] as int,
      name: json['name'] as String,
      active: json['active'] as int,
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      color: json['color'] as String,
      minStaff: json['min_staff'] as int,
      sortOrder: json['sort_order'] as int,
    );
  }
}

class Week {
  const Week({
    required this.weekId,
    required this.year,
    required this.weekNumber,
  });

  final int weekId;
  final int year;
  final int weekNumber;

  factory Week.fromJson(Map<String, dynamic> json) {
    return Week(
      weekId: json['week_id'] as int,
      year: json['year'] as int,
      weekNumber: json['week_number'] as int,
    );
  }
}

class PlanShift extends Shift {
  const PlanShift({
    required super.shiftId,
    required super.name,
    required super.active,
    required super.startTime,
    required super.endTime,
    required super.color,
    required super.minStaff,
    required super.sortOrder,
    required this.assignedStaff,
  });

  final List<Staff> assignedStaff;

  factory PlanShift.fromJson(Map<String, dynamic> json) {
    return PlanShift(
      shiftId: json['shift_id'] as int,
      name: json['name'] as String,
      active: json['active'] as int,
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      color: json['color'] as String,
      minStaff: json['min_staff'] as int,
      sortOrder: json['sort_order'] as int,
      assignedStaff: (json['assigned_staff'] as List<dynamic>)
          .map((staff) => Staff.fromJson(staff as Map<String, dynamic>))
          .toList(),
    );
  }
}

class WeeklyShiftplan {
  const WeeklyShiftplan({
    required this.week,
    required this.shifts,
    required this.patternWeek,
  });

  final Week week;
  final List<PlanShift> shifts;
  final int patternWeek;

  factory WeeklyShiftplan.fromJson(Map<String, dynamic> json) {
    return WeeklyShiftplan(
      week: Week.fromJson(json['week'] as Map<String, dynamic>),
      shifts: (json['shifts'] as List<dynamic>)
          .map((shift) => PlanShift.fromJson(shift as Map<String, dynamic>))
          .toList(),
      patternWeek: json['pattern_week'] as int,
    );
  }
}
