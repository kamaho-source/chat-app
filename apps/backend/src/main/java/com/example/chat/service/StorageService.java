package com.example.chat.service;

import com.example.chat.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import com.example.chat.repository.*;
import com.example.chat.model.*;

@Service
public class StorageService {
  private final Path baseDir;

  public StorageService(AppProperties properties) throws IOException {
    this.baseDir = Path.of(properties.getStorage().getBaseDir()).toAbsolutePath();
    Files.createDirectories(baseDir);
  }

  public StoredFile store(MultipartFile file, String folder) throws IOException {
    String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
    String filename = UUID.randomUUID() + "_" + original;
    Path targetDir = baseDir.resolve(folder);
    Files.createDirectories(targetDir);
    Path target = targetDir.resolve(filename);
    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return new StoredFile(filename, "/api/files/" + folder + "/" + filename, file.getSize());
  }

  public Path resolve(String folder, String filename) {
    return baseDir.resolve(folder).resolve(filename).normalize();
  }

  public record StoredFile(String filename, String url, long size) {}
}
