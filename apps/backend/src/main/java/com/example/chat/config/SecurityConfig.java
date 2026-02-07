package com.example.chat.config;

import com.example.chat.security.CheckUserActiveFilter;
import com.example.chat.security.RestAccessDeniedHandler;
import com.example.chat.security.RestAuthenticationEntryPoint;
import com.example.chat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  private final AppProperties appProperties;
  private final UserRepository userRepository;
  private final CheckUserActiveFilter checkUserActiveFilter;
  private final RestAuthenticationEntryPoint authenticationEntryPoint;
  private final RestAccessDeniedHandler accessDeniedHandler;
  private final boolean csrfCookieSecure;

  public SecurityConfig(AppProperties appProperties,
                        UserRepository userRepository,
                        CheckUserActiveFilter checkUserActiveFilter,
                        RestAuthenticationEntryPoint authenticationEntryPoint,
                        RestAccessDeniedHandler accessDeniedHandler,
                        @Value("${APP_ENV:development}") String appEnv) {
    this.appProperties = appProperties;
    this.userRepository = userRepository;
    this.checkUserActiveFilter = checkUserActiveFilter;
    this.authenticationEntryPoint = authenticationEntryPoint;
    this.accessDeniedHandler = accessDeniedHandler;
    this.csrfCookieSecure = "production".equalsIgnoreCase(appEnv);
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf
            .csrfTokenRepository(csrfTokenRepository())
            .ignoringRequestMatchers("/api/auth/login", "/api/auth/register")
        )
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .securityContext(securityContext -> securityContext.requireExplicitSave(false))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/channels", "/api/channels/*").permitAll()
            .requestMatchers("/api/auth/register", "/api/auth/register-child", "/api/auth/login", "/api/auth/logout", "/api/auth/classroom-login", "/api/auth/guest", "/api/csrf", "/ws/**").permitAll()
            .anyRequest().authenticated()
        )
        .sessionManagement(session -> session.sessionFixation().migrateSession())
        .authenticationProvider(authenticationProvider())
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint(authenticationEntryPoint)
            .accessDeniedHandler(accessDeniedHandler)
        )
        .addFilterAfter(checkUserActiveFilter, org.springframework.security.web.authentication.AnonymousAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public UserDetailsService userDetailsService() {
    return username -> userRepository.findByEmail(username)
        .orElseThrow(() -> new IllegalArgumentException("User not found"));
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService());
    provider.setPasswordEncoder(passwordEncoder());
    return provider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
    return configuration.getAuthenticationManager();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(appProperties.getSecurity().getFrontendOrigin()));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  @Bean
  public CookieCsrfTokenRepository csrfTokenRepository() {
    CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
    repository.setCookiePath("/");
    repository.setCookieCustomizer(cookie -> cookie.sameSite("Lax").secure(csrfCookieSecure));
    return repository;
  }
}
