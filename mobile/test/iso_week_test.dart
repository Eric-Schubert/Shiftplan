import 'package:flutter_test/flutter_test.dart';
import 'package:shiftplan_mobile/src/ui/iso_week.dart';

void main() {
  test('calculates ISO week rollover at year boundaries', () {
    expect(IsoWeek.fromDate(DateTime.utc(2026, 1, 1)).year, 2026);
    expect(IsoWeek.fromDate(DateTime.utc(2026, 1, 1)).week, 1);

    final lastWeek2026 = IsoWeek(year: 2026, week: IsoWeek.weeksInYear(2026));
    expect(lastWeek2026.next().year, 2027);
    expect(lastWeek2026.next().week, 1);
  });
}
