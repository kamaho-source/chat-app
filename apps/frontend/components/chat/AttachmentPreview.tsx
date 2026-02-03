"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";

const Document = dynamic(async () => (await import("react-pdf")).Document, { ssr: false });
const Page = dynamic(async () => (await import("react-pdf")).Page, { ssr: false });

type Props = {
  file?: File;
  url?: string | null;
};

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toLowerCase();
}

function isOffice(ext: string) {
  return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
}

export default function AttachmentPreview({ file, url }: Props) {
  const sourceUrl = file ? URL.createObjectURL(file) : url || "";
  const fileName = file?.name || (url ? url.split("/").pop() || "attachment" : "attachment");
  const ext = getExtension(fileName);
  const pdfFile = useMemo(() => (sourceUrl ? { url: sourceUrl } : undefined), [sourceUrl]);

  useEffect(() => {
    let active = true;
    import("react-pdf").then(({ pdfjs }) => {
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    });
    return () => {
      active = false;
    };
  }, []);

  if (!sourceUrl) return null;

  if (file?.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return <Box component="img" src={sourceUrl} alt={fileName} sx={{ maxWidth: "100%", borderRadius: 2 }} />;
  }

  if (file?.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext)) {
    return <Box component="video" src={sourceUrl} controls sx={{ maxWidth: "100%", borderRadius: 2 }} />;
  }

  if (file?.type === "application/pdf" || ext === "pdf") {
    return (
      <Box sx={{ border: "1px solid var(--cw-border)", borderRadius: 2, overflow: "hidden", p: 1 }}>
        <Document file={pdfFile} loading={<Typography variant="body2">PDFを読み込み中...</Typography>}>
          <Page pageNumber={1} width={560} />
        </Document>
      </Box>
    );
  }

  if (isOffice(ext)) {
    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          component="a"
          href={sourceUrl}
          download={fileName}
        >
          ダウンロード
        </Button>
        <Typography variant="body2">{fileName}</Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Button variant="text" component="a" href={sourceUrl} target="_blank" rel="noreferrer">
        ファイルを開く
      </Button>
      <Typography variant="body2">{fileName}</Typography>
    </Stack>
  );
}
