import 'package:flutter/material.dart';

import '../models/api_models.dart';
import 'app_controller.dart';

class PlannerPage extends StatelessWidget {
  const PlannerPage({
    required this.controller,
    super.key,
  });

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final plan = controller.currentPlan;

    return Scaffold(
      appBar: AppBar(
        title: Text('KW ${controller.selectedWeek}/${controller.selectedYear}'),
        actions: [
          IconButton(
            tooltip: 'Aktualisieren',
            onPressed: controller.busy ? null : controller.refreshCurrentWeek,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Abmelden',
            onPressed: controller.busy ? null : controller.logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _WeekToolbar(controller: controller),
            if (controller.errorMessage != null)
              _ErrorBanner(message: controller.errorMessage!),
            Expanded(
              child: Stack(
                children: [
                  if (plan == null)
                    const Center(child: Text('Kein Plan geladen'))
                  else
                    _ShiftList(controller: controller, plan: plan),
                  if (controller.busy)
                    const Positioned.fill(
                      child: ColoredBox(
                        color: Color(0x33ffffff),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WeekToolbar extends StatelessWidget {
  const _WeekToolbar({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        children: [
          IconButton.filledTonal(
            tooltip: 'Vorige Woche',
            onPressed: controller.busy ? null : controller.previousWeek,
            icon: const Icon(Icons.chevron_left),
          ),
          Expanded(
            child: Column(
              children: [
                Text(
                  'Kalenderwoche ${controller.selectedWeek}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  '${controller.selectedYear}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          IconButton.filledTonal(
            tooltip: 'Naechste Woche',
            onPressed: controller.busy ? null : controller.nextWeek,
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
    );
  }
}

class _ShiftList extends StatelessWidget {
  const _ShiftList({
    required this.controller,
    required this.plan,
  });

  final AppController controller;
  final WeeklyShiftplan plan;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      itemCount: plan.shifts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final shift = plan.shifts[index];
        return _ShiftTile(controller: controller, shift: shift);
      },
    );
  }
}

class _ShiftTile extends StatelessWidget {
  const _ShiftTile({
    required this.controller,
    required this.shift,
  });

  final AppController controller;
  final PlanShift shift;

  @override
  Widget build(BuildContext context) {
    final assigned = shift.assignedStaff;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showStaffPicker(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _ColorDot(color: shift.color),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      shift.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Text('${shift.startTime}-${shift.endTime}'),
                ],
              ),
              const SizedBox(height: 12),
              if (assigned.isEmpty)
                Text(
                  'Nicht besetzt',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final staff in assigned)
                      Chip(label: Text(staff.name)),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showStaffPicker(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        final assignedIds = shift.assignedStaff.map((staff) => staff.staffId).toSet();
        final activeStaff = controller.staff.where((staff) => staff.isActive).toList();

        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Text(
                  shift.name,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              for (final staff in activeStaff)
                CheckboxListTile(
                  value: assignedIds.contains(staff.staffId),
                  title: Text(staff.name),
                  onChanged: (_) async {
                    Navigator.of(context).pop();
                    if (assignedIds.contains(staff.staffId)) {
                      await controller.unassignStaff(
                        shiftId: shift.shiftId,
                        staffId: staff.staffId,
                      );
                    } else {
                      await controller.assignStaff(
                        shiftId: shift.shiftId,
                        staffId: staff.staffId,
                      );
                    }
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ColorDot extends StatelessWidget {
  const _ColorDot({required this.color});

  final String color;

  @override
  Widget build(BuildContext context) {
    final value = int.tryParse(color.replaceFirst('#', '0xff'));
    return Container(
      width: 14,
      height: 14,
      decoration: BoxDecoration(
        color: value == null ? Theme.of(context).colorScheme.primary : Color(value),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onErrorContainer,
        ),
      ),
    );
  }
}
