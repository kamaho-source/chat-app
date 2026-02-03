package com.example.chat.config;

import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapData implements CommandLineRunner {
  private final AppProperties properties;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public BootstrapData(AppProperties properties, UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.properties = properties;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  public void run(String... args) {
    AppProperties.Bootstrap bootstrap = properties.getBootstrap();
    if (!bootstrap.isEnabled()) {
      return;
    }
    userRepository.findByEmail(bootstrap.getEmail()).orElseGet(() -> {
      User user = new User();
      user.setEmail(bootstrap.getEmail());
      user.setName(bootstrap.getName());
      user.setPassword(passwordEncoder.encode(bootstrap.getPassword()));
      try {
        user.setRole(Role.valueOf(bootstrap.getRole()));
      } catch (IllegalArgumentException ex) {
        user.setRole(Role.ADMIN);
      }
      return userRepository.save(user);
    });
  }
}
