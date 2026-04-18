import 'package:dio/dio.dart';

class ApiClient {
  ApiClient({String? token}) : _token = token {
    _dio = Dio(
      BaseOptions(
        baseUrl: const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'http://localhost:3001/api',
        ),
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(minutes: 2),
      ),
    );
  }

  late final Dio _dio;
  String? _token;

  set token(String? value) {
    _token = value;
  }

  Map<String, String> get _authHeaders {
    if (_token == null || _token!.isEmpty) return const {};
    return {'Authorization': 'Bearer $_token'};
  }

  Future<Response<dynamic>> get(String path) {
    return _dio.get(path, options: Options(headers: _authHeaders));
  }

  Future<Response<dynamic>> post(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    bool auth = true,
  }) {
    return _dio.post(
      path,
      data: data,
      queryParameters: query,
      options: Options(headers: auth ? _authHeaders : null),
    );
  }

  Future<Response<dynamic>> put(String path, {Object? data}) {
    return _dio.put(
      path,
      data: data,
      options: Options(headers: _authHeaders),
    );
  }

  Future<Response<dynamic>> multipart(
    String path, {
    required FormData data,
  }) {
    return _dio.post(
      path,
      data: data,
      options: Options(headers: _authHeaders),
    );
  }
}
