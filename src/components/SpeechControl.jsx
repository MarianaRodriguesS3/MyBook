
import {
  useEffect,
  useRef
} from "react";

import { useSpeech } from "../contexts/SpeechContext";



function splitText(text) {

  if (!text) return [];


  return text
    .split(/(?<=[.!?])\s+/)
    .filter(
      item =>
        item.trim().length > 0
    );

}




function SpeechControl({

  currentPage,

  getPageContent,

  totalPages,

  playing,

  setPlaying,

  setReadingPage,

  setActiveSentence,

  onFinishPage

}) {


  const { speech } =
    useSpeech();



  const currentUtterance =
    useRef(null);



  const sentenceIndex =
    useRef(0);



  const sentences =
    useRef([]);




  const pageReading =
    useRef(null);







  function speakSentence(){



    if(
      sentenceIndex.current >=
      sentences.current.length
    ){


      onFinishPage(
        pageReading.current
      );


      return;


    }







    const index =
      sentenceIndex.current;



    setActiveSentence(
      index
    );





    const text =
      sentences.current[index];




    const utterance =
      new SpeechSynthesisUtterance(
        text
      );



    utterance.lang =
      "pt-BR";



    utterance.rate =
      1;



    utterance.pitch =
      1;







    utterance.onend = () => {


      sentenceIndex.current++;


      speakSentence();


    };







    utterance.onerror = () => {


      setPlaying(false);


      setActiveSentence(null);


    };







    currentUtterance.current =
      utterance;



    window.speechSynthesis.speak(
      utterance
    );


  }









  function startReading(pageNumber){



    const page =
      getPageContent(
        pageNumber
      );



    /*
      página sem texto

      procura próxima página
    */


    if(
      !page ||
      !page.text ||
      page.text.trim()===""
    ){



      let next =
        pageNumber + 1;



      while(
        next <= totalPages
      ){



        const nextPage =
          getPageContent(
            next
          );



        if(
          nextPage &&
          nextPage.text &&
          nextPage.text.trim()
        ){

          return startReading(
            next
          );

        }


        next++;

      }



      setPlaying(false);


      return;

    }







    window.speechSynthesis.cancel();



    sentences.current =
      splitText(
        page.text
      );



    sentenceIndex.current =
      0;



    pageReading.current =
      pageNumber;



    setReadingPage(
      pageNumber
    );



    setPlaying(true);



    speakSentence();


  }









  function toggle(){



    if(!speech){

      return;

    }






    if(
      window.speechSynthesis.speaking
    ){



      if(
        window.speechSynthesis.paused
      ){


        window.speechSynthesis.resume();


        setPlaying(true);



      }else{


        window.speechSynthesis.pause();


        setPlaying(false);



      }



      return;

    }






    startReading(
      currentPage
    );


  }








  useEffect(()=>{



    function handler(){


      toggle();


    }



    document.addEventListener(

      "toggle-reader-speech",

      handler

    );



    return ()=>{


      document.removeEventListener(

        "toggle-reader-speech",

        handler

      );


    };



  });









  useEffect(()=>{


    return ()=>{


      window.speechSynthesis.cancel();


    };


  },[]);








  return null;


}


export default SpeechControl;

