/**
 * Minimal markdown helpers for non-assistant content (user bubbles).
 * Assistant message rendering is handled by Streamdown.
 */

/** @deprecated — kept for reference only; use Streamdown for assistant messages */
function renderMarkdown(text: string): string {
  if (!text) return "";

  text = text.replace(/\r\n/g, "\n");

  const codeBlocks: Array<{ lang: string; code: string }> = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang, code: code.replace(/\n$/, "") });
    return `%%CODEBLOCK_${idx}%%`;
  });

  const lines = text.split("\n");
  let html = "";
  let inList = false;
  let listType = "";
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  function flushBlockquote() {
    if (inBlockquote) {
      html +=
        "<blockquote>" + blockquoteLines.map((l) => renderInline(l)).join("<br>") + "</blockquote>";
      inBlockquote = false;
      blockquoteLines = [];
    }
  }

  function flushList() {
    if (inList) {
      html += `</${listType}>`;
      inList = false;
    }
  }

  function isTableSeparator(line: string) {
    return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
  }

  function isTableRow(line: string) {
    return line.trim().startsWith("|") && line.trim().endsWith("|");
  }

  function parseAlignments(line: string) {
    return line
      .split("|")
      .filter((c) => c.trim())
      .map((cell) => {
        const t = cell.trim();
        if (t.startsWith(":") && t.endsWith(":")) return "center";
        if (t.endsWith(":")) return "right";
        return "left";
      });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const codeMatch = line.match(/^%%CODEBLOCK_(\d+)%%$/);
    if (codeMatch) {
      flushList();
      flushBlockquote();
      const block = codeBlocks[parseInt(codeMatch[1])];
      const langLabel = block.lang || "code";
      html += `<div class="code-block-wrapper">`;
      html += `<div class="code-block-header"><span>${escHtml(langLabel)}</span><button class="copy-btn" data-copy="code">Copy</button></div>`;
      html += `<pre><code>${escHtml(block.code)}</code></pre></div>`;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushList();
      flushBlockquote();
      const alignments = parseAlignments(lines[i + 1]);
      const headerRow = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
      html += '<div class="table-wrapper"><table><thead><tr>';
      headerRow.forEach((cell, idx) => {
        const align = alignments[idx] || "left";
        html += `<th style="text-align:${align}">${renderInline(cell.trim())}</th>`;
      });
      html += "</tr></thead><tbody>";
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        const rowCells = lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
        html += "<tr>";
        rowCells.forEach((cell, idx) => {
          const align = alignments[idx] || "left";
          html += `<td style="text-align:${align}">${renderInline(cell.trim())}</td>`;
        });
        html += "</tr>";
        i++;
      }
      html += "</tbody></table></div>";
      i--;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushList();
      flushBlockquote();
      html += "<hr>";
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushBlockquote();
      const level = headingMatch[1].length;
      html += `<h${level}>${renderInline(headingMatch[2])}</h${level}>`;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteLines = [];
      }
      const content = line.replace(/^>\s?/, "");
      blockquoteLines.push(content);
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    const taskMatch = line.match(/^(\s*)[*\-+]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      if (!inList || listType !== "ul") {
        flushList();
        html += '<ul class="task-list">';
        inList = true;
        listType = "ul";
      }
      const checked = taskMatch[2] !== " ";
      html += `<li class="task-list-item"><input type="checkbox" disabled ${checked ? "checked" : ""}> ${renderInline(taskMatch[3])}</li>`;
      continue;
    }

    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)$/);
    if (ulMatch) {
      flushBlockquote();
      if (!inList || listType !== "ul") {
        if (inList) html += `</${listType}>`;
        html += "<ul>";
        inList = true;
        listType = "ul";
      }
      html += `<li>${renderInline(ulMatch[2])}</li>`;
      continue;
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      flushBlockquote();
      if (!inList || listType !== "ol") {
        if (inList) html += `</${listType}>`;
        html += "<ol>";
        inList = true;
        listType = "ol";
      }
      html += `<li>${renderInline(olMatch[2])}</li>`;
      continue;
    }

    flushList();

    if (line.trim() === "") {
      continue;
    }

    html += `<p>${renderInline(line)}</p>`;
  }

  flushList();
  flushBlockquote();

  return html;
}

export function renderUserMarkdown(text: string): string {
  if (!text) return "";
  text = text.replace(/\r\n/g, "\n");

  const lines = text.split("\n");
  let html = "";
  let inBlockquote = false;
  let bqLines: string[] = [];

  function flushBq() {
    if (inBlockquote) {
      html += "<blockquote>" + bqLines.map((l) => renderInline(l)).join("<br>") + "</blockquote>";
      inBlockquote = false;
      bqLines = [];
    }
  }

  for (const line of lines) {
    if (/^>\s?/.test(line)) {
      if (!inBlockquote) {
        inBlockquote = true;
        bqLines = [];
      }
      bqLines.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushBq();
    html += renderInline(line) + "\n";
  }
  flushBq();

  return html.replace(/\n$/, "");
}

function renderInline(text: string): string {
  const codeSpans: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code: string) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${escHtml(code)}</code>`);
    return `%%ICODE${idx}%%`;
  });

  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-image">');
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");
  text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  text = text.replace(
    /(^|[^"'])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener">$2</a>',
  );
  text = text.replace(/%%ICODE(\d+)%%/g, (_, idx: string) => codeSpans[parseInt(idx)]);

  return text;
}

export function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
