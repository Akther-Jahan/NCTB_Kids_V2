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
      lines: string[];
      buttonText?: string;
      character?: string;
      animation?: string;
    };
  };
  onComplete: () => void;
};


export default function AnimatedStoryActivity({
  activity,
  onComplete,
}: Props) {

   const { title, instruction, data } = activity;


  const bounce = useRef(
    new Animated.Value(0)
  ).current;


  const [lineIndex,setLineIndex] =
    useState(0);


  const [text,setText] =
    useState("");



  const currentLine = data.lines[lineIndex] ?? "";



  useEffect(()=>{


    Animated.loop(

      Animated.sequence([

        Animated.timing(
          bounce,
          {
            toValue:1,
            duration:800,
            useNativeDriver:true,
          }
        ),


        Animated.timing(
          bounce,
          {
            toValue:0,
            duration:800,
            useNativeDriver:true,
          }
        )

      ])

    ).start();


  },[]);



  useEffect(()=>{


    let i = 0;

    setText("");


    const timer =
      setInterval(()=>{

        if(i <= currentLine.length){

          setText(
            currentLine.slice(0,i)
          );

          i++;

        }

      },70);



    Speech.stop();


    Speech.speak(
      currentLine,
      {
        language:"bn-BD",
        rate:0.75,
        pitch:1.1,
      }
    );



    return ()=>clearInterval(timer);


  },[lineIndex]);





  const translateY =
    bounce.interpolate({

      inputRange:[0,1],

      outputRange:[0,-12]

    });



  const next = ()=>{

    if(lineIndex < data.lines.length-1){

      setLineIndex(
        lineIndex+1
      );


    }else{

      Speech.stop();

      onComplete();

    }


  };



  return (

    <View style={styles.container}>


      <Animated.View
        style={{
          transform:[
            {
              translateY
            }
          ]
        }}
      >

      <MimiCharacter
 emotion="talking"
 size={220}
/>

<MimiBubble
 text={text}
/>

      </Animated.View>



      <View style={styles.bubble}>


        <Text style={styles.text}>
          {text}
        </Text>


      </View>




      <Pressable
        style={styles.button}
        onPress={next}
      >

        <Text style={styles.buttonText}>
          {lineIndex === data.lines.length - 1
  ? data.buttonText ?? "পরেরটি 🚀"
  : "পরেরটি ➡️"}

        </Text>


      </Pressable>



    </View>

  );
}



const styles = StyleSheet.create({


container:{
alignItems:"center",
width:"100%",
},


mimi:{
width:260,
height:300,
},


bubble:{
width:"95%",
padding:18,
backgroundColor:"#FFF3BF",
borderRadius:24,
borderWidth:2,
borderColor:"#FFB000",
marginTop:10,
},


text:{
fontSize:20,
fontWeight:"800",
textAlign:"center",
lineHeight:30,
color:"#333",
},


button:{
marginTop:20,
backgroundColor:"#4CAF50",
paddingHorizontal:30,
paddingVertical:14,
borderRadius:25,
},


buttonText:{
color:"#fff",
fontSize:18,
fontWeight:"900",
},


});