import 'package:flutter/material.dart';

import 'src/app.dart';

const _defaultApiBaseUrl = String.fromEnvironment(
  'SHIFTPLAN_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

void main() {
  runApp(const ShiftplanApp(apiBaseUrl: _defaultApiBaseUrl));
}
