import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert , TextInput, Button, TouchableOpacity, ScrollView, Image } from 'react-native';
// import { useDispatch } from 'react-redux'; // TEST
import * as ImageManipulator from "expo-image-manipulator";
import axios from 'axios';
import ENV from '../../env';
import * as Speech from 'expo-speech';
import { AntDesign } from '@expo/vector-icons';

// TODO: TEST
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

import LANGUAGES from '../constants/Languages';
import Colors from '../constants/Colors';
import ImagePicker from '../components/ImagePicker';
import URLS from '../constants/Urls';
import getWordsBtn from '../../assets/get-words-btn.png'; 

const defaultLanguage = Localization.locale.includes("-") ? Localization.locale.split("-")[0] : Localization.locale

const WordTranslator = (props) => {
  const id = props.route.params.currentId; 
  const signedIn = props.route.params.signedIn;

  const [selectedImage, setSelectedImage] = useState();
  const [apiPhoto, setAPIPhoto] = useState();
  const [getText, setGetText] = useState();
  const [errorMessage, setErrorMessage] = useState();
  const [translatedText, setTranslatedText] = useState();
  const [targetLang, setTargetLang] = useState('en');
  const [images, setImages] = useState([]);
  const [myImages, setMyImages] = useState([]);
  const [originalLang, setOriginalLang] = useState('en');
  
  const initialStateForm = {
    image_url: null,
    text: null,
    translated_text: null,
    favorite: false,
    language: null,
    user_id: props.route.params.currentId
  }
  const [state, setState] = useState(initialStateForm);
  
  const { route, navigation } = props;
  
  useEffect(() => {
    getImages();
  }, []);

  const titleChangeHandler = text => {
    // could add validation 
    setTitleValue(text);
  };


  const imageTakenHandler = async imagePath => {
    setSelectedImage(imagePath);
    // a promise
    let photo = await ImageManipulator.manipulateAsync(
      imagePath,
      [{ resize: { width: 420 } }],
      {
        base64: true
      }
    );
  
    setAPIPhoto(photo.base64);
  };
  
  const saveImageHandler = () => {
    
    const body = {
      image_url: selectedImage, // apiPhoto,
      text: getText,
      translated_text: translatedText,
      favorite: true,
      language: displayLanguage(targetLang),
      user_id: id,
      original_lang: displayLanguage(originalLang),
    };


    const copyState = {...state}
    copyState["id"] = images.length + 1
    copyState["favorite"] = true
    setState(copyState);

    console.log("images.length? ", images.length + 1)
    const copyMyImages = [...myImages];
    axios.post(`${URLS.BASE_URL}/add_image`, body)
      .then(response => {
        console.log('internal API - success: ', response.data)
        console.log(body)
        copyMyImages.push(body);
        setMyImages(copyMyImages);

        console.log('copyMyImages in Photo', copyMyImages);
      })
      .catch(err => {
        console.log('3. internal API - error: ', err)

        Alert.alert(
          "Unique value needed",
          "Oops. The same picture or text exists in your favorite list. Please update a unique value.",
          [
            { 
              text: "OK",
              onPress: () => console.log("OK pressed")
            }
          ]
        )
    
      })
  };
  
  
  const getWords = () => {
    if (!apiPhoto) {
      Alert.alert(
        "Image Needed",
        "Please select a picture from gallery or take a picture",
        [
          { text: "OK", 
            onPress: () => console.log("OK Pressed") 
          }
        ]
      )
    } else {
      const baseUrl = `https://content-vision.googleapis.com/v1/images:annotate?key=${ENV.googleApiKey}`;
      const body = {
        requests: [
          {
            features: [
              {
                type: 'TEXT_DETECTION',
              }
            ],
            image: {
              content: apiPhoto
            },
          }
        ]
      }
      axios.post(baseUrl, body)
        .then((response) => {
          const TEXT = response.data.responses[0].textAnnotations[0].description.replace(/\s+/g, " ");
          const LANG = response.data.responses[0].textAnnotations[0].locale
          console.log(response.data.responses[0].textAnnotations[0].description.replace(/\s+/g, " "));
          setGetText(TEXT);
          if (googleDetected(LANG)) {
            setOriginalLang(LANG);
          }
          getTranslated(TEXT);
        })
        .catch((error) => {

          Alert.alert(
            "Text Needed",
            "Please select a picture with text",
            [
              { text: "OK", 
                onPress: () => console.log("OK Pressed") 
              }
            ]
          )
          setErrorMessage(error.message);
          console.log('error', error);
        })
    }
  };
  const googleDetected = (detectLang) => {
    return Object.keys(LANGUAGES).find(label => {
      return LANGUAGES[label] == detectLang;
    })
  };


  const getTranslated = (text) => {
    const ENCODED = encodeURI(text)
    let target_lang 
    if (route.params.item) {
      const { item } = route.params
      target_lang = item.language
    } else {
      target_lang = "zh-TW"
    }
    // console.log('loading')
    // console.log('lang', target_lang);
    setTargetLang(target_lang);
    const translateUrl = `https://translation.googleapis.com/language/translate/v2?target=${target_lang}&key=${ENV.googleApiKey}&q=${ENCODED}`
    axios.post(translateUrl)
    .then((response) => {
      const TRANSLATION = response.data.data.translations[0].translatedText;
      setTranslatedText(TRANSLATION);
    })
    .catch((error) => {
      setErrorMessage(error.message);
      console.log('error', error);
    })
  }

  const toSpeak = (words, lang) => {
  
    Speech.speak( words,{language: lang});
  }
  const getImages = () => {
    axios.get(URLS.BASE_URL + '/images')
      .then(response => {

        const apiData = response.data.images;
        setImages(apiData);

        const currImages = apiData.filter(image => {
          return image.user_id === id
        })
        setMyImages(currImages);
      })
      .catch(err => {
        console.log('internal API - error: ', err)
        setErrorMessage(err.message);
      })

  };
  

  const displayLanguage = (target) => {
    return Object.keys(LANGUAGES).find(label => {
      return LANGUAGES[label] == target;
    })
  };
  
  const getTranslation = () => {
    if (!targetLang) {
      Alert.alert(
        "Need to select Language",
        "Please change a language setting",
        [
          { text: "OK", 
            onPress: () => console.log("OK Pressed") 
          }
        ]
      )
    } else {
      getTranslated(getText);
      setState({...state, favorite: false});
    }
  }

  const languageButtons = (marginTop) => {
    return (
      <View style={styles.languageBtnContainer} marginTop={marginTop}>
        <TouchableOpacity
          style={styles.languageBtn}
          onPress={() => {
            navigation.navigate('Settings', { item: 'text' })
          }}
        >
          <Text style={styles.buttonText}>Language</Text>
        </TouchableOpacity>
        {/* adding arrow */}
        <AntDesign style={styles.space} name="arrowright" size={24} color={Colors.primary} />

        <TouchableOpacity
          style={styles.languageBtn}
          onPress={getTranslation}  
        >
          <Text style={styles.buttonText}> Translate! </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const reset = () => {
    setState(initialStateForm);
    setAPIPhoto(null);
    setGetText(null);
    setTranslatedText(null);
  }

  return (
    <ScrollView>
      <View style={styles.container}>

      <View style={styles.favoriteButton}>
      {signedIn && //myImages.length > 0 && 
          <Button 
            title="My Favorites" 
            color={Colors.primary} 
            onPress={() => {
              navigation.navigate('List', 
              {
                currentId: id, 
              })
            }}
          />
        }
        </View>

        <ImagePicker 
          onImageTaken={imageTakenHandler} 
          resetCallback={reset}
          root="word"
        />

        <View style={styles.buttonContainer}>
          {signedIn && apiPhoto && targetLang && getText && translatedText && (state.favorite === true) && 
            <AntDesign.Button
              name="star" 
              size={30} 
              color="#C99B13" 
              backgroundColor="#fff"
            >
            </AntDesign.Button>
          }
          
          {signedIn && apiPhoto && targetLang && getText && translatedText && (state.favorite === false) && 
            <AntDesign.Button 
            name="staro" 
            size={30} 
            color="#C99B13" 
            backgroundColor="#fff"
            onPress={saveImageHandler}
            >
            </AntDesign.Button>
          }

          {/* TEST */}
          {(signedIn && apiPhoto && getText && translatedText) &&
      
            <TouchableOpacity style={styles.getWordsBtnHigh} onPress={getWords}>
              <Image source={getWordsBtn} />
            </TouchableOpacity>
          }

          {(!signedIn && apiPhoto && getText && translatedText) &&
            <TouchableOpacity style={styles.getWordsBtnLow} onPress={getWords}>
              <Image source={getWordsBtn} />
            </TouchableOpacity>
          }

          {!signedIn && apiPhoto && !getText && !translatedText &&

            <TouchableOpacity style={styles.getWordsBtnLow} onPress={getWords}>
              <Image source={getWordsBtn} />
            </TouchableOpacity>
          }

          {signedIn && apiPhoto && !getText && !translatedText &&
            
            <TouchableOpacity style={styles.getWordsBtnLow} onPress={getWords}>
              <Image source={getWordsBtn} />
            </TouchableOpacity>
          }

          {/* TEST */}
        </View>
        
        { (translatedText || getText)  && 
          <View style={styles.cardsContainer}> 
            <View style={styles.cardContainer}>
              <Text style={styles.cardText}>{displayLanguage(originalLang)}</Text>
              <View style={styles.card}>
                <Text>
                  {getText}
                </Text>
              </View>

            <AntDesign.Button 
            name="sound" 
            size={24} 
            color={Colors.primary} 
            backgroundColor='#fff'
            onPress={() => toSpeak(getText, originalLang)}
            />
            </View>
          {/* </View> */}
        
        {/* //  (translatedText || getText)  &&  */}
          {/* //  */}
          {/* <View style={styles.cardsContainer}>  */}
            <View style={styles.cardContainer}>
              <Text style={styles.cardText}>{displayLanguage(targetLang)}</Text>
              <View style={styles.card}>
                <Text>
                  {translatedText}
                </Text>
              </View>

            <AntDesign.Button 
            name="sound" 
            size={24} 
            color={Colors.primary} 
            backgroundColor='#fff'
            onPress={() => toSpeak(translatedText, targetLang)}
            />
            </View>
          </View>
        }

    
        {
          apiPhoto && getText && languageButtons(60)  
        }
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: '100%',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: 15,
    backgroundColor: '#FAFAFA',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginVertical: 5,
    width: 220
  },
  languageBtn: {
    right: 0,
    borderRadius: 30,
    padding: 10,
    margin: 20,
    paddingVertical: 12,
    paddingHorizontal: 15
  },
  languageBtnContainer: {
    position: 'absolute',
    bottom: '23%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopColor: Colors.primary,
    borderTopWidth: 1,
    width: "100%",
  },
  // textbox: {
  //   // borderWidth: 1,
  //   // borderRadius: 5,
  //   maxWidth: "70%",
  //   minWidth: "70%",
  //   // borderColor: Colors.primary
  // },
  buttonContainer: {
    position: 'absolute',
    top: 290,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: Colors.primary,
  },
  cornerButton: {
    right: 0,
    backgroundColor: Colors.primary,
    color: "#fff",
    borderRadius: 5,
    padding: 10,
    margin: 20
  },
  cardsContainer: {
    marginTop: 25,
    position: 'absolute',
    top: 320,
    marginBottom: 25,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5,
    borderRadius: 30,
  },
  cardText: {
    marginRight: 20,
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0
  },
  getWordsBtnLow: {
    position: 'absolute',
    bottom: -450,
  },
  getWordsBtnHigh: {
    position: 'absolute',
    zIndex: 10,
    bottom: -400,
  },
})

export default WordTranslator;