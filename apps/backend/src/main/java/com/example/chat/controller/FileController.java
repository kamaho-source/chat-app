package com.example.chat.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.MalformedURLException;
import java.nio.file.Path;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/files")
public class FileController {
  private final StorageService storageService;

  public FileController(StorageService storageService) {
    this.storageService = storageService;
  }

  @GetMapping("/{folder}/{filename}")
  public ResponseEntity<Resource> download(@PathVariable String folder, @PathVariable String filename) throws MalformedURLException {
    Path path = storageService.resolve(folder, filename);
    Resource resource = new UrlResource(path.toUri());
    return ResponseEntity.ok(resource);
  }
}
