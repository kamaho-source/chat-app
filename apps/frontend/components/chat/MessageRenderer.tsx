"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

export default function MessageRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const language = /language-(\w+)/.exec(className || "")?.[1] ?? "";
          const isInline = !className;
          if (isInline) {
            return (
              <Box component="code" sx={{ px: 0.5, py: 0.2, bgcolor: "rgba(0,0,0,0.06)", borderRadius: 1 }}>
                {children}
              </Box>
            );
          }
          return <CodeBlock language={language} value={String(children)} />;
        },
        p({ children }) {
          return (
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {children}
            </Typography>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value.trimEnd());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "#0f172a", borderRadius: 2, p: 1.5, color: "#e2e8f0" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
          {language || "code"}
        </Typography>
        <Button size="small" onClick={onCopy} startIcon={<ContentCopyIcon />} sx={{ color: "#cbd5f5" }}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </Stack>
      <Box component="pre" sx={{ margin: 0, overflowX: "auto" }}>
        <Box component="code" sx={{ fontFamily: "var(--font-geist-mono)" }}>
          {value}
        </Box>
      </Box>
    </Box>
  );
}
