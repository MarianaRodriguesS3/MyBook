import { useRef } from "react";
import PageText from "./PageText";

function PageImages({ images }) {
  if (!images || images.length === 0) return null;

  return (
    <>
      {images.map((src, index) => (
        <img key={index} src={src} alt="" className="page-image" />
      ))}
    </>
  );
}

function PageContent({
  content,
  loadingLabel,
  mode,
  activeSentence,
  clickable,
  onSentenceClick,
  searchHighlight,
}) {
  if (!content) {
    return <p className="page-loading">{loadingLabel}</p>;
  }

  const cleanText = content.text
    ? content.text.replace(/\*/g, "").replace(/@@/g, "").trim()
    : "";
  const hasText = cleanText.length > 0;

  if (!hasText) {
    return (
      <div className="page-fit image-only">
        <PageImages images={content.images} />
      </div>
    );
  }

  return (
    <div className="page-fit">
      <PageText
        text={content.text}
        images={content.images}
        blocks={content.blocks}
        activeSentence={activeSentence}
        mode={mode}
        clickable={clickable}
        onSentenceClick={onSentenceClick}
        searchHighlight={searchHighlight}
      />
    </div>
  );
}

function ReaderBook({
  mode,
  currentPage,
  totalPages,
  getPageContent,
  loadingLabel,
  readingPage,
  activeSentence,
  playing,
  onSentenceClick,
  searchHighlight,
  previousPage,
  nextPage,
}) {
  const clickable = true;
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > minSwipeDistance && nextPage) {
        nextPage();
      }

      if (distanceX < -minSwipeDistance && previousPage) {
        previousPage();
      }
    }
  };

  return (
    <section
      className={`book-area ${mode}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {mode === "landscape" ? (
        <>
          <div className="page left-page">
            <PageContent
              content={getPageContent(currentPage)}
              loadingLabel={loadingLabel}
              mode={mode}
              activeSentence={
                readingPage === currentPage ? activeSentence : null
              }
              clickable={clickable}
              onSentenceClick={(sentenceIndex) =>
                onSentenceClick(currentPage, sentenceIndex)
              }
              searchHighlight={
                searchHighlight && searchHighlight.page === currentPage
                  ? searchHighlight
                  : null
              }
            />
          </div>

          <div className="page-divider"></div>

          <div className="page right-page">
            {currentPage + 1 <= totalPages && (
              <PageContent
                content={getPageContent(currentPage + 1)}
                loadingLabel={loadingLabel}
                mode={mode}
                activeSentence={
                  readingPage === currentPage + 1 ? activeSentence : null
                }
                clickable={clickable}
                onSentenceClick={(sentenceIndex) =>
                  onSentenceClick(currentPage + 1, sentenceIndex)
                }
                searchHighlight={
                  searchHighlight && searchHighlight.page === currentPage + 1
                    ? searchHighlight
                    : null
                }
              />
            )}
          </div>
        </>
      ) : (
        <div className="page single-page">
          <PageContent
            content={getPageContent(currentPage)}
            loadingLabel={loadingLabel}
            mode={mode}
            activeSentence={readingPage === currentPage ? activeSentence : null}
            clickable={clickable}
            onSentenceClick={(sentenceIndex) =>
              onSentenceClick(currentPage, sentenceIndex)
            }
            searchHighlight={
              searchHighlight && searchHighlight.page === currentPage
                ? searchHighlight
                : null
            }
          />
        </div>
      )}
    </section>
  );
}

export default ReaderBook;
