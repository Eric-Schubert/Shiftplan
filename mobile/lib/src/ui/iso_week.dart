class IsoWeek {
  const IsoWeek({
    required this.year,
    required this.week,
  });

  final int year;
  final int week;

  static IsoWeek current() => fromDate(DateTime.now());

  static IsoWeek fromDate(DateTime input) {
    final date = DateTime.utc(input.year, input.month, input.day);
    final thursday = date.add(Duration(days: 4 - date.weekday));
    final yearStart = DateTime.utc(thursday.year);
    final week =
        (thursday.difference(yearStart).inDays / 7).floor() + 1;
    return IsoWeek(year: thursday.year, week: week);
  }

  IsoWeek next() {
    final maxWeeks = weeksInYear(year);
    if (week >= maxWeeks) {
      return IsoWeek(year: year + 1, week: 1);
    }
    return IsoWeek(year: year, week: week + 1);
  }

  IsoWeek previous() {
    if (week <= 1) {
      final previousYear = year - 1;
      return IsoWeek(
        year: previousYear,
        week: weeksInYear(previousYear),
      );
    }
    return IsoWeek(year: year, week: week - 1);
  }

  static int weeksInYear(int year) {
    return fromDate(DateTime.utc(year, 12, 28)).week;
  }
}
