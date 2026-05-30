import 'package:flutter/material.dart';

import 'api/shiftplan_api_client.dart';
import 'storage/token_store.dart';
import 'ui/app_controller.dart';
import 'ui/login_page.dart';
import 'ui/planner_page.dart';

class ShiftplanApp extends StatefulWidget {
  const ShiftplanApp({
    required this.apiBaseUrl,
    super.key,
  });

  final String apiBaseUrl;

  @override
  State<ShiftplanApp> createState() => _ShiftplanAppState();
}

class _ShiftplanAppState extends State<ShiftplanApp> {
  late final AppController controller;

  @override
  void initState() {
    super.initState();
    controller = AppController(
      api: ShiftplanApiClient(
        baseUri: Uri.parse(widget.apiBaseUrl),
        tokenStore: SecureTokenStore(),
      ),
    )..bootstrap();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Schichtplan',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff6366f1)),
        useMaterial3: true,
      ),
      home: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          return switch (controller.authStatus) {
            AuthStatus.checking => const _StartupPage(),
            AuthStatus.signedOut => LoginPage(controller: controller),
            AuthStatus.signedIn => PlannerPage(controller: controller),
          };
        },
      ),
    );
  }
}

class _StartupPage extends StatelessWidget {
  const _StartupPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
