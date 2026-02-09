# AI Summarizer Optimization Plan

Enhance the AI summarization feature to be more robust, handle long chapters via metadata fallbacks, and support page-level summarization.

## User Review Required

> [!IMPORTANT]
> For large chapters, we will now fallback to using metadata (title, author, chapter name) to generate a general summary if the text exceeds token limits. We are also introducing a "Summarize Current Page" option for quicker, more context-specific insights.

## Proposed Changes

### API Layer

#### [MODIFY] [route.ts](file:///Users/lalit/Desktop/libro_me/src/app/api/ai/summarize-v2/route.ts)
-   **Improved Prompt**: Update the prompt to handle `chapterTitle` and `chapterNumber`.
-   **Metadata Fallback**: If the provided `text` is missing or extremely short, use the metadata to generate a "Literary Context" summary.
-   **Validation**: Add better logging for request payload sizes.

### Component Layer

#### [MODIFY] [Reader.tsx](file:///Users/lalit/Desktop/libro_me/src/components/Reader/Reader.tsx)
-   **Metadata Extraction**: Improve extraction of the current chapter title and number from the Table of Contents (`toc`).
-   **Page-Level Text**: Implement `handleSummarizePage` which only extracts text from the visible portion of the current chapter.
-   **Toggle UI**: Add a way for users to choose between "Summarize Page" and "Summarize Chapter" in the Summary Modal.

## Verification Plan

### Manual Verification
1.  Open a book and click "Summarize Chapter".
2.  Verify that it works for long chapters (15k+ characters).
3.  Test "Summarize Page" and confirm it only summarizes the visible text.
4.  Check browser console for "AI: Prompt Metadata Fallback" logs if text is missing.
