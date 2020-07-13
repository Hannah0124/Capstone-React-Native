import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Button, TouchableOpacity, ScrollView, Alert } from 'react-native'; 
import { useDispatch } from 'react-redux'; // TEST
import * as ImageManipulator from "expo-image-manipulator"; // npm i expo-image-manipulator
import axios from 'axios'; // npm i react-native-axios
import ENV from '../../env'; // npm i expo-env
import * as Speech from 'expo-speech';
import { AntDesign } from '@expo/vector-icons';

// TODO: TEST
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';


import Colors from '../constants/Colors';
import LANGUAGES from '../constants/Languages';
import URLS from '../constants/Urls';
import * as imagesActions from '../store/images-actions';
import ImagePicker from '../components/ImagePicker';
import LineButton from '../components/LineButton';

import * as FileSystem from 'expo-file-system';

const defaultLanguage = Localization.locale.includes("-") ? Localization.locale.split("-")[0] : Localization.locale

// Set the locale once at the beginning of your app.
i18n.locale = defaultLanguage;

// console.log('defaultLanguage: ', defaultLanguage);
console.log('i18n.locale: ', i18n.locale)

const PhotoTranslator = (props) => {

  const uid = props.route.params.currentUid || "123";
  // const testImages = props.route.params.images;

  console.log('!!images in PhotoTranslator.js: ', props.route.params.images)
  console.log('!!uid in PhotoTranslator.js: ', props.route.params.currentUid)

  const [titleValue, setTitleValue] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [apiPhoto, setApiPhoto] = useState(null);
  const [getText, setGetText] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [flashMessage, setFlashMessage] = useState(null);
  const [currLanguage, setCurrLanguage] = useState('ko');
  const [translatedText, setTranslatedText] = useState(null);
  const [images, setImages] = useState([]);
  const [myImages, setMyImages] = useState([]);

  const { route, navigation } = props;
  
  // console.log('images??', props.route.params.images);

  useEffect(() => {
    axios.get(URLS.BASE_URL + '/images')
      .then(response => {

        
        const apiData = response.data.images;

        // console.log('/images?? apiData: ', apiData)

        const currImages = apiData.filter(image => {
          return image.user_id === uid
        })

        // getImages(1, apiData); // 1 => dummy_data
        setMyImages(currImages);

        // console.log('yo!', currImages)
      })
      .catch(err => {
        console.log('internal API - error: ', err)
        setErrorMessage(err.message);
      })
  }, [])


  const getLanguage = () => {
    
    console.log('route? ', route);
    
    if (!route.params.item) {
      Alert.alert(
        "Need to select Language",
        "Please change a language setting",
        [
          { text: "OK", 
            onPress: () => console.log("OK Pressed") 
          }
        ]
      )
      
      // setFlashMessage('You must change language setting!');

      // setTimeout(() => {
      //   setFlashMessage(null);
      // }, 3000);

      return;
    }

    const { item } = route.params;
    const { language } = item;
    console.log('language: ', language);

    setCurrLanguage(language);
    getTranslated(getText, language);

    return language 
  }; 

  const dispatch = useDispatch(); // TEST

  // TEST
  const titleChangeHandler = text => {
    // You could add validation 
    setTitleValue(text);
  };

  // TODO: TEST
  const imageTakenHandler = async imagePath => {
    setSelectedImage(imagePath);

    // a promise 
    let photo = await ImageManipulator.manipulateAsync(
      imagePath,
      [{ resize: { width: 420 }}],
      {
        base64: true
      }
    );

    setApiPhoto(photo.base64);
  };

  // console.log('myimages??: ', myImages)

  // TEST
  const saveImageHandler = () => {

    // console.log('state in PhotoTranslator.js: ', props.route.params);

    const body = {
      image_url: selectedImage, // apiPhoto,
      text: getText,
      translated_text: translatedText,
      favorite: true,
      language: currLanguage,
      user_id: uid
    };

    // console.log('body??', body);

    // const copyMyImages = getImages(uid, images); // TODO test

    const copyMyImages = [...myImages];

    // console.log('huh?', copyMyImages)

    axios.post(`${URLS.BASE_URL}/add_image`, body)
      .then(response => {
        console.log('internal API - success: ', response.data)

        copyMyImages.push(body);
        setMyImages(copyMyImages);

        console.log('copyMyImages in Photo', copyMyImages);

        navigation.navigate('List', { currentUid: uid, myImages: copyMyImages })
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

    // dispatch(imagesActions.addImage(selectedImage, getText, translatedText, true, 'Korean'));

    // // navigation.goBack();
    
  };

  const getWords = () => {
    // edge case
    if (!apiPhoto) {
      Alert.alert(
        "Image Needed",
        "Please select a picture from gallery or take a picture",
        [
          { 
            text: "OK",
            onPress: () => console.log("OK pressed")
          }
        ]
      )
    }
    
    
    
    const body = {
      requests: [
        {
          features: [
            {
              maxResults: 1,  //TODO: 1 for now due to API charge
              type: "LABEL_DETECTION"
            },
          ],
          //
          image: {
            content: apiPhoto
          },
        }
      ]
    }

    axios.post(URLS.GOOGOLE_VISION_URL, body)
      .then(response => {
        console.log('response.data: ', response.data.responses[0].labelAnnotations)

        const apiData = response.data.responses[0].labelAnnotations;

        const descriptions = apiData.map(data => {
          return data.description;
        })

        console.log('SUCCESS 4', descriptions);
        setGetText(descriptions.join(', '));
        setErrorMessage('');
        setTranslatedText(null);

        // // TODO (TEST)
        // getLanguage();
        getTranslated(descriptions.join(', '), currLanguage);
      })
      .catch(err => {
        setErrorMessage(err.message);
        console.log('(1) ERROR - Vision API: ', err);
      })
  };

  const getTranslated = (word, targetLang) => {

    const body = {
        q: word,
        source: "en",
        target: targetLang, // e.g. "es",
        format: "text"
      }

    axios.post(URLS.GOOGOLE_TRANSLATION_URL, body)
      .then(response => {
        // console.log('response.data: ', response.data.data.translations[0].translatedText);

        setTranslatedText(response.data.data.translations[0].translatedText);
        setErrorMessage('');

      })
      .catch(err => {
        Alert.alert(
          "Need to select Language",
          "Please change a language setting",
          [
            { text: "OK", 
              onPress: () => console.log("OK Pressed") 
            }
          ]
        )

        // setFlashMessage('Something went wrong. :(');

        // setTimeout(() => {
        //   setFlashMessage(null);
        // }, 3000);

        setErrorMessage(err.message);
        console.log('(2) ERROR - Translation API: ', err);
      })
  };


  const displayLanguage = (target) => {
    return Object.keys(LANGUAGES).find(label => {
      return LANGUAGES[label] == target;
    })
  };

  const speak = (targetText, selectedLanguage) => {
    // let targetText = translatedText || getText;

    Speech.speak(targetText, {language: selectedLanguage});
  };
  
  const languageButtons = (marginTop) => {
    return (
      <View style={styles.buttonContainer} marginTop={marginTop}>
        <TouchableOpacity
          style={styles.cornerButton}
          onPress={() => {
            navigation.navigate('Settings', { item: 'photo' })
          }}
        >
          <Text style={styles.buttonText}>Language</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cornerButton}
          onPress={getLanguage} // onPress={() => {getTranslated(getText, currLanguage)}}   
        >
          <Text style={styles.buttonText}> Let's translate! </Text>
        </TouchableOpacity>
      </View>
    )
  }



  return (
    <ScrollView>
      <View style={styles.container}>

        {/* TEST */}
        {/* <TextInput 
          style={styles.textInput} 
          onChangeText={titleChangeHandler} 
          value={titleValue}
        /> */}

      
        {/* { flashMessage && 
          <View style={styles.flash}>
            <Text>{flashMessage}</Text> 
          </View> 
        } */}

        {/* 
        <Text>
          {errorMessage && errorMessage}
        </Text> */}


        <ImagePicker 
          onImageTaken={imageTakenHandler} 
        />

        <View style={styles.buttonContainer}>
          {apiPhoto &&
            <LineButton 
              title="Get Words"
              color={Colors.primary}
              onPress={getWords}
            />
          }

          {apiPhoto && currLanguage && getText && translatedText &&
            <LineButton 
              title="Save Image" 
              color={Colors.primary} 
              onPress={saveImageHandler}
            />
          }
        </View>

        <LineButton 
          title="Image List" 
          color={Colors.primary} 
          onPress={() => {
            navigation.navigate('List', {currentUid: uid, myImages: myImages})
          }}
        />


        { (translatedText || getText)  &&
          <View style={styles.cardsContainer}> 
            <View style={styles.cardContainer}>
              <Text style={styles.cardText}>{displayLanguage(i18n.locale)}</Text>
              <Text style={styles.card}>
                {getText && getText}
              </Text>

              <AntDesign.Button 
                name="sound" 
                size={24} 
                color={Colors.primary} 
                backgroundColor='#fff'
                onPress={() => speak(getText, i18n.locale)}
              />
            </View>

            <View style={styles.cardContainer}>
              <Text style={styles.cardText}>{displayLanguage(currLanguage)}</Text>
              <Text style={styles.card}>
                {translatedText}
              </Text>
              <AntDesign.Button 
                name="sound" 
                size={24} 
                color={Colors.primary} 
                backgroundColor='#fff'
                onPress={() => speak(translatedText, currLanguage)}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: '100%',
  },
  // text: {
  //   color: '#747EFD',
  //   fontSize: 24,
  //   fontWeight: 'bold'
  // },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerButton: {
    right: 0,
    backgroundColor: Colors.primary,
    color: "#fff",
    borderRadius: 5,
    padding: 10,
    margin: 20
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
  },
  cardsContainer: {
    marginTop: 20
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardText: {
    marginRight: 20,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: 5,
    backgroundColor: '#FAFAFA',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
    width: 220
  },
  flash: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderColor: '#ffeeba',
    padding: 10,
    marginBottom: 2,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  }
})

export default PhotoTranslator;

// reference - picker: https://snack.expo.io/S1_ipbwSL
// reference - speech: https://docs.expo.io/versions/latest/sdk/speech/
// reference - icon: https://docs.expo.io/guides/icons/