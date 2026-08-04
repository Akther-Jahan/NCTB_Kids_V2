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
import ActivityTransition from "./ActivityTransition";

type Props = {
  activity: {
    title?: string;
    instruction?: string;
    data: {
      letter: string;
      sound: string;
      examples: {
        emoji: string;
        word: string;
      }[];
    };
  };
  onComplete: () => void;
};


export default function LetterActivity({
  activity,
  onComplete,
}: Props) {

  const { title, instruction, data } = activity;
  const scale = useRef(
    new Animated.Value(0.5)
  ).current;


  const bounce = useRef(
    new Animated.Value(0)
  ).current;


  const [showExample,setShowExample] =
    useState(false);


  const [success,setSuccess] =
    useState(false);

  const [showReward,setShowReward] =
    useState(false);



  useEffect(()=>{


    Animated.spring(
      scale,
      {
        toValue:1,
        friction:4,
        tension:50,
        useNativeDriver:true,
      }
    ).start();


    Speech.speak(
      `এটি হলো ${data.letter}`,
      {
        language:"bn-BD",
        rate:0.75,
        pitch:1.2,
      }
    );


  },[]);



  const learnLetter = ()=>{


    setShowExample(true);

    setSuccess(true);


    Animated.loop(

      Animated.sequence([
        Animated.timing(
          bounce,
          {
            toValue:1,
            duration:500,
            useNativeDriver:true,
          }
        ),

        Animated.timing(
          bounce,
          {
            toValue:0,
            duration:500,
            useNativeDriver:true,
          }
        )
      ])

    ).start();



    Speech.stop();

   Speech.speak(
  `${data.letter} দিয়ে শব্দ শেখা যাক`,
  {
    language:"bn-BD",
    rate:0.75,
  }
);


setShowReward(true);


setTimeout(()=>{

  onComplete();

},3000);

}; 



  const moveY =
    bounce.interpolate({

      inputRange:[0,1],

      outputRange:[0,-12]

    });



  return (

    <View style={styles.container}>
    <MimiCharacter
 emotion="happy"
 size={160}
/>

<MimiBubble
 text="এই অক্ষরটা চিনতে পারবে?"
/>


      <Text style={styles.title}>
        ⭐ অক্ষর শেখি
      </Text>



      <Animated.View
        style={{
          transform:[
            {
              scale
            },
            {
              translateY:moveY
            }
          ]
        }}
      >

        <Text style={styles.letter}>
          {data.letter}
        </Text>


      </Animated.View>



      <Text style={styles.question}>
        এই অক্ষরটি চিনতে পারবে? 😊
      </Text>



      <Pressable
        style={styles.button}
        onPress={learnLetter}
      >

        <Text style={styles.buttonText}>
          ✨ {data.sound} শিখি
        </Text>

      </Pressable>




      {
        success &&
        <Text style={styles.success}>
          🎉 দারুণ! তুমি অক্ষর চিনেছো ⭐
        </Text>
      }



      {
        showExample &&

        <View style={styles.exampleBox}>

         
         <Text style={styles.title}>
  {title ?? "⭐ অক্ষর শেখি"}
</Text>
        


          {
            data.examples.map(
              (item,index)=>(

                <View
                  key={index}
                  style={styles.card}
                >

                  <Text style={styles.emoji}>
                    {item.emoji}
                  </Text>


                  <Text style={styles.word}>
                    {item.word}
                  </Text>


                </View>

              )
            )
          }


        </View>

      }



    </View>

  );

}



const styles = StyleSheet.create({

container:{
alignItems:"center",
padding:20,
flex:1,
width:"100%",
},


mimi:{
width:150,
height:160,
},


title:{
fontSize:25,
fontWeight:"900",
color:"#D84C83",
},


letter:{
fontSize:120,
fontWeight:"900",
color:"#FF7A00",
},


question:{
fontSize:18,
fontWeight:"800",
marginVertical:15,
},


button:{
backgroundColor:"#4CAF50",
paddingHorizontal:30,
paddingVertical:15,
borderRadius:25,
},


buttonText:{
color:"#fff",
fontSize:20,
fontWeight:"900",
},


success:{
marginTop:18,
fontSize:20,
fontWeight:"900",
color:"#2E7D32",
},


exampleBox:{
marginTop:25,
alignItems:"center",
},


exampleTitle:{
fontSize:22,
fontWeight:"900",
},


card:{
flexDirection:"row",
alignItems:"center",
backgroundColor:"#FFF3BF",
padding:15,
marginTop:10,
borderRadius:20,
width:230,
},


emoji:{
fontSize:45,
marginRight:20,
},


word:{
fontSize:25,
fontWeight:"900",
},


});