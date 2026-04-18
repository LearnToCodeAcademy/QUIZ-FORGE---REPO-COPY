import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import 'api_client.dart';

class AuthService {
  AuthService(this._api);

  final ApiClient _api;
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  static const _tokenKey = 'quizforge_token';

  Future<void> initGoogle() async {
    await _googleSignIn.initialize();
  }

  Future<String?> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    _api.token = token;
    return token;
  }

  Future<User> loginWithGoogle() async {
    final account = await _googleSignIn.authenticate();
    final auth = await account.authentication;
    final idToken = auth.idToken;

    if (idToken == null || idToken.isEmpty) {
      throw Exception('Google idToken missing.');
    }

    final loginResponse = await _api.post(
      '/auth/google',
      auth: false,
      data: {'credential': idToken},
    );

    final token = loginResponse.data['token'] as String? ?? '';
    if (token.isEmpty) {
      throw Exception('Backend did not return auth token.');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    _api.token = token;

    final me = await getMe();
    if (me == null) {
      throw Exception('Authentication succeeded but user data could not be loaded.');
    }
    return me;
  }

  Future<User?> getMe() async {
    try {
      final response = await _api.get('/auth/me');
      final payload = response.data as Map<String, dynamic>;
      final userJson = payload['user'] as Map<String, dynamic>?;
      if (userJson == null) return null;
      return User.fromJson(userJson);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveApiKeys({String? grokKey, String? geminiKey}) async {
    await _api.put('/auth/api-keys', data: {
      'grokKey': grokKey,
      'geminiKey': geminiKey,
    });
  }

  Future<void> logout() async {
    await _api.post('/auth/logout', data: const {});
    await _googleSignIn.signOut();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    _api.token = null;
  }
}
