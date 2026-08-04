import React, { useEffect, useRef, useState } from "react";

import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import * as Speech from "expo-speech";
import MimiCharacter from "./MimiCharacter";
import MimiBubble from "../components/MimiBubble";
type Props = {
  activity: {
    title?: string;
    instruction?: string;
    data: {
      prompt: string;
      letters: string[];
      answer: string;
    };
  };
  onComplete: () => void;
};



export default function WordBuildActivity({
  activity,
  onComplete,
}: Props) {

  const { title, instruction, data } = activity;
  const scale =
    useRef(new Animated.Value(0.8)).current;


  const [selected,setSelected] =
    useState<string[]>([]);


  const [completed,setCompleted] =
    useState(false);



  const word =
    selected.join("");



  useEffect(()=>{


    Animated.spring(
      scale,
      {
        toValue:1,
        friction:5,
        tension:50,
        useNativeDriver:true,
      }
    ).start();



    Speech.speak(
      "অক্ষরগুলো সাজিয়ে শব্দ তৈরি করো",
      {
        language:"bn-BD",
        rate:0.75,
      }
    );


  },[]);



  function selectLetter(letter:string){


    if(selected.length >= data.letters.length)
      return;



    const next =
      [...selected,letter];


    setSelected(next);



    if(next.join("") === data.answer){


      setCompleted(true);


      Speech.stop();


      Speech.speak(
        "দারুণ! তুমি শব্দ তৈরি করতে পেরেছো",
        {
          language:"bn-BD",
          rate:0.75,
        }
      );


      setTimeout(()=>{

        onComplete();

      },1200);


    }

  }




  function reset(){

    setSelected([]);

    setCompleted(false);

  }




  return (

    <View style={styles.container}>

    <MimiCharacter
 emotion="happy"
 size={160}
/>

<MimiBubble
 text="অক্ষরগুলো সাজিয়ে শব্দ বানাও"
/>

      <Text style={styles.title}>
  {title ?? "⭐ শব্দ বানাই"}
</Text>



      <Text style={styles.prompt}>
        {data.prompt}
      </Text>



      <Animated.View
        style={{
          transform:[
            {
              scale
            }
          ]
        }}
      >

        <View style={styles.answerBox}>

          <Text style={styles.word}>
            {word || "___"}
          </Text>

        </View>


      </Animated.View>




      <Text style={styles.help}>
        অক্ষরগুলো ট্যাপ করে সাজাও 😊
      </Text>



      <View style={styles.row}>


        {
          data.letters.map(
            (letter,index)=>(

              <Pressable

                key={index}

                style={styles.letterBox}

                onPress={()=>selectLetter(letter)}

              >

                <Text style={styles.letter}>
                  {letter}
                </Text>


              </Pressable>

            )
          )
        }


      </View>




      {
        completed &&

        <Text style={styles.success}>
          🎉 অসাধারণ! +10 ⭐
        </Text>

      }



      {
        selected.length === data.letters.length &&
        !completed &&

        <Pressable
          style={styles.reset}
          onPress={reset}
        >

          <Text style={styles.resetText}>
            আবার চেষ্টা করি 🔄
          </Text>


        </Pressable>

      }



    </View>

  );

}



const styles = StyleSheet.create({

container:{
alignItems:"center",
padding:20,
},


mimi:{
width:150,
height:160,
},


title:{
fontSize:26,
fontWeight:"900",
color:"#D84C83",
},


prompt:{
fontSize:20,
fontWeight:"800",
marginVertical:15,
textAlign:"center",
},


answerBox:{
backgroundColor:"#FFF3BF",
borderRadius:25,
paddingHorizontal:40,
paddingVertical:15,
borderWidth:2,
borderColor:"#FFB000",
},


word:{
fontSize:55,
fontWeight:"900",
color:"#FF7A00",
},


help:{
marginTop:20,
fontSize:18,
fontWeight:"700",
},


row:{
flexDirection:"row",
gap:15,
marginTop:25,
},


letterBox:{
backgroundColor:"#FFD166",
padding:20,
borderRadius:20,
elevation:3,
},


letter:{
fontSize:40,
fontWeight:"900",
},


success:{
marginTop:25,
fontSize:25,
fontWeight:"900",
color:"#2E7D32",
},


reset:{
marginTop:20,
backgroundColor:"#7BDFF2",
paddingHorizontal:25,
paddingVertical:12,
borderRadius:20,
},


resetText:{
fontSize:18,
fontWeight:"800",
},

});