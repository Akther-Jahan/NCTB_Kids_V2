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
      question: string;
      options: {
        emoji: string;
        label: string;
      }[];
      answer: number;
    };
  };

  onComplete: () => void;
};


export default function PictureChoiceActivity({
  activity,
  onComplete,
}: Props) {

  const { title, instruction, data } = activity;
  const scale = useRef(
    new Animated.Value(0.8)
  ).current;


  const [selected,setSelected] =
    useState<number | null>(null);


  const [success,setSuccess] =
    useState(false);



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
      data.question,
      {
        language:"bn-BD",
        rate:0.75,
      }
    );


  },[]);




  function choose(index:number){


    setSelected(index);



    if(index === data.answer){


      setSuccess(true);


      Speech.stop();


      Speech.speak(
        "দারুণ! তুমি সঠিক ছবি খুঁজে পেয়েছো",
        {
          language:"bn-BD",
          rate:0.75,
        }
      );


      setTimeout(()=>{

        onComplete();

      },1200);



    }else{


      Speech.stop();


      Speech.speak(
        "আবার চেষ্টা করো বন্ধু",
        {
          language:"bn-BD",
          rate:0.75,
        }
      );

    }

  }




  return (

    <View style={styles.container}>

      <MimiCharacter
 emotion="happy"
 size={160}
/>

      <Text style={styles.title}>
        ⭐ ছবি চিনে নেই
      </Text>



      <Text style={styles.question}>
        {data.question}
      </Text>




      <Animated.View
        style={[
          styles.options,
          {
            transform:[
              {
                scale
              }
            ]
          }
        ]}
      >

        {
          data.options.map(
            (item,index)=>(

              <Pressable

                key={index}

                style={[
                  styles.card,

                  selected === index &&
                  styles.selected,

                  selected === index &&
                  index === data.answer &&
                  styles.correctCard
                ]}


                onPress={()=>choose(index)}

              >


                <Text style={styles.emoji}>
                  {item.emoji}
                </Text>


                <Text style={styles.label}>
                  {item.label}
                </Text>


              </Pressable>

            )
          )
        }


      </Animated.View>




      {
        success &&

        <Text style={styles.success}>
          🎉 অসাধারণ! +10 ⭐
        </Text>

      }



      {
        selected !== null &&
        !success &&

        <Text style={styles.retry}>
          ❌ আবার চেষ্টা করো বন্ধু
        </Text>

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



question:{
fontSize:22,
fontWeight:"900",
textAlign:"center",
marginVertical:20,
},



options:{
flexDirection:"row",
gap:15,
},



card:{
backgroundColor:"#F2F2F2",
padding:20,
borderRadius:25,
alignItems:"center",
borderWidth:2,
borderColor:"#eee",
},



selected:{
backgroundColor:"#FFD166",
},



correctCard:{
backgroundColor:"#A8E6A3",
},



emoji:{
fontSize:60,
},



label:{
fontSize:20,
fontWeight:"800",
marginTop:10,
},



success:{
marginTop:25,
fontSize:25,
fontWeight:"900",
color:"#2E7D32",
},



retry:{
marginTop:25,
fontSize:22,
fontWeight:"900",
color:"#E53935",
},


});