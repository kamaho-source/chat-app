package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.example.chat.model.*;

public interface ClassroomUserRepository extends JpaRepository<ClassroomUser, Long> {
  List<ClassroomUser> findByClassroomId(Long classroomId);
  Optional<ClassroomUser> findByClassroomIdAndUserId(Long classroomId, Long userId);
}
