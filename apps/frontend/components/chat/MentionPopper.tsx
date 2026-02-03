"use client";

import { List, ListItemButton, ListItemText, Paper, Popper } from "@mui/material";
import { UserSummary } from "@/lib/types";

type Props = {
  anchorEl: HTMLElement | null;
  open: boolean;
  users: UserSummary[];
  selectedIndex: number;
  onSelect: (user: UserSummary) => void;
};

export default function MentionPopper({ anchorEl, open, users, selectedIndex, onSelect }: Props) {
  if (!open) return null;

  return (
    <Popper open={open} anchorEl={anchorEl} placement="top-start" sx={{ zIndex: 1300 }}>
      <Paper sx={{ width: 280, maxHeight: 240, overflowY: "auto" }}>
        <List dense>
          {users.map((user, idx) => (
            <ListItemButton
              key={user.id}
              selected={idx === selectedIndex}
              onClick={() => onSelect(user)}
            >
              <ListItemText primary={user.name} secondary={user.email} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Popper>
  );
}
