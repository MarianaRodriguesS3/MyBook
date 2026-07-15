
import {
  useEffect,
  useState
} from "react";

import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useReader } from "../contexts/ReaderContext";

import ReaderBook from "../components/ReaderBook";
import SpeechControl from "../components/SpeechControl";
import FooterReader from "../components/FooterReader";

import "./Reader.css";



function Reader() {


  const { t } =
    useLanguage();


  const { theme } =
    useTheme();



  const {

    closeFile,

    currentPage,
    setCurrentPage,

    totalPages,

    mode,
    setMode,

    loadPage,
    getPageContent


  } = useReader();





  // controle visual da leitura
  const [playing,setPlaying] =
    useState(false);



  // página que está sendo narrada
  const [readingPage,setReadingPage] =
    useState(null);



  // frase atual para destaque
  const [activeSentence,setActiveSentence] =
    useState(null);








  /*
    Carrega páginas visíveis
  */

  useEffect(()=>{


    if(mode==="landscape"){


      loadPage(
        currentPage
      );



      if(
        currentPage + 1 <= totalPages
      ){

        loadPage(
          currentPage + 1
        );

      }



    }else{


      loadPage(
        currentPage
      );


    }


  },[
    currentPage,
    mode,
    totalPages,
    loadPage
  ]);









  /*
    Troca automática após leitura
  */

  function handleFinishPage(pageNumber){



    setActiveSentence(null);





    /*
      Modo uma página

      procura próxima página
      com texto
    */

    if(mode==="portrait"){



      let next =
        pageNumber + 1;



      while(
        next <= totalPages
      ){



        const page =
          getPageContent(
            next
          );



        if(
          page &&
          page.text &&
          page.text.trim()
        ){


          setCurrentPage(
            next
          );


          return;


        }



        next++;


      }



      setPlaying(false);


      return;


    }








    /*
      Modo duas páginas

      esquerda → direita

      depois próximo par
    */



    if(
      pageNumber === currentPage
      &&
      currentPage + 1 <= totalPages
    ){


      const rightPage =
        getPageContent(
          currentPage + 1
        );



      if(
        rightPage &&
        rightPage.text &&
        rightPage.text.trim()
      ){


        setReadingPage(
          currentPage + 1
        );


        return;


      }


    }







    const nextPair =
      currentPage + 2;



    if(
      nextPair <= totalPages
    ){


      setCurrentPage(
        nextPair
      );



      return;


    }




    setPlaying(false);


  }









  function toggleMode(){


    setMode(

      mode === "landscape"

        ? "portrait"

        : "landscape"

    );


  }









  function previousPage(){


    setActiveSentence(null);


    if(currentPage > 1){


      setCurrentPage(
        currentPage - 1
      );


    }


  }








  function nextPage(){


    setActiveSentence(null);



    if(
      currentPage < totalPages
    ){


      setCurrentPage(
        currentPage + 1
      );


    }


  }









  return (

    <div
      className={`reader theme-${theme}`}
    >


      <ReaderBook

        mode={mode}

        currentPage={currentPage}

        totalPages={totalPages}

        getPageContent={getPageContent}

        loadingLabel={
          t("loadingPage")
        }

        readingPage={readingPage}

        activeSentence={activeSentence}

      />






      <SpeechControl

        currentPage={currentPage}

        getPageContent={getPageContent}

        totalPages={totalPages}

        mode={mode}

        playing={playing}

        setPlaying={setPlaying}

        setReadingPage={setReadingPage}

        setActiveSentence={setActiveSentence}

        onFinishPage={
          handleFinishPage
        }

      />






      <FooterReader

        currentPage={currentPage}

        totalPages={totalPages}

        playing={playing}

        mode={mode}

        previousPage={previousPage}

        nextPage={nextPage}

        toggleSpeech={()=>{
          document
            .dispatchEvent(
              new Event(
                "toggle-reader-speech"
              )
            );
        }}

        toggleMode={toggleMode}

        closeFile={closeFile}

      />



    </div>

  );

}


export default Reader;

