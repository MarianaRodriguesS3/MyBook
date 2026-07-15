
import PageText from "./PageText";





function PageImages({
  images,
  hasText
}) {


  if (!images || images.length === 0) {
    return null;
  }



  return (

    <>
      {
        images.map(
          (src, index) => (

            <img

              key={index}

              src={src}

              alt=""

              className={
                hasText
                  ? "page-image"
                  : "page-image page-image-full"
              }

            />

          )
        )
      }
    </>

  );

}









function PageContent({

  content,

  loadingLabel,

  mode,

  activeSentence

}) {



  if (!content) {


    return (

      <p className="page-loading">

        {loadingLabel}

      </p>

    );

  }







  const hasText =
    content.text &&
    content.text.trim().length > 0;








  return (

    <div

      className={
        `page-fit ${
          hasText
            ? ""
            : "image-only"
        }`
      }

    >



      <PageImages

        images={
          content.images
        }

        hasText={
          hasText
        }

      />





      {
        hasText &&


        <PageText

          text={
            content.text
          }

          activeSentence={
            activeSentence
          }

          mode={
            mode
          }

        />

      }





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

  activeSentence

}) {



  return (

    <section

      className={
        `book-area ${mode}`
      }

    >





      {
        mode === "landscape"

        ?


        <>


          <div className="page left-page">


            <PageContent


              content={

                getPageContent(
                  currentPage
                )

              }


              loadingLabel={
                loadingLabel
              }


              mode={
                mode
              }


              activeSentence={

                readingPage === currentPage

                ?

                activeSentence

                :

                null

              }


            />


          </div>








          <div className="page-divider"></div>








          <div className="page right-page">


            {
              currentPage + 1 <= totalPages &&


              <PageContent


                content={

                  getPageContent(
                    currentPage + 1
                  )

                }


                loadingLabel={
                  loadingLabel
                }


                mode={
                  mode
                }


                activeSentence={

                  readingPage === currentPage + 1

                  ?

                  activeSentence

                  :

                  null

                }


              />


            }


          </div>



        </>



        :



        <div className="page single-page">


          <PageContent


            content={

              getPageContent(
                currentPage
              )

            }


            loadingLabel={
              loadingLabel
            }


            mode={
              mode
            }


            activeSentence={

              readingPage === currentPage

              ?

              activeSentence

              :

              null

            }


          />


        </div>



      }



    </section>

  );

}





export default ReaderBook;

