
import {
  useLayoutEffect,
  useRef
} from "react";



const MIN_FONT_SIZE = 9;





function splitText(text) {


  if(!text)
    return [];



  return text

    .split(
      /(?<=[.!?])\s+/
    )

    .filter(
      item =>
        item.trim().length > 0
    );


}






function PageText({

  text,

  activeSentence,

  mode

}) {



  const containerRef =
    useRef(null);





  const sentences =
    splitText(text);








  /*
    Ajusta tamanho do texto
    para caber na página
  */

  useLayoutEffect(()=>{


    const el =
      containerRef.current;



    if(!el)
      return;




    let size =
      mode === "portrait"
        ? 28
        : 22;





    el.style.fontSize =
      `${size}px`;






    while(

      el.scrollHeight >
      el.clientHeight

      &&

      size > MIN_FONT_SIZE

    ){


      size--;


      el.style.fontSize =
        `${size}px`;


    }





  },[
    text,
    mode
  ]);









  if(!text){

    return null;

  }








  return (

    <div

      ref={containerRef}

      className="page-text"

    >



      {
        sentences.map(

          (sentence,index)=>(


            <span

              key={index}

              className={

                index === activeSentence

                ?

                "sentence active"

                :

                "sentence"

              }

            >

              {sentence}{" "}

            </span>


          )

        )

      }




    </div>

  );

}





export default PageText;

