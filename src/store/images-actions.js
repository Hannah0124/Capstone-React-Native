import * as FileSystem from 'expo-file-system';

export const ADD_IMAGE = 'ADD_IMAGE';
export const SET_IMAGES = 'SET_IMAGES';

import { insertImage, fetchImages } from '../helpers/db';

export const addImage = (title, image) => {
  return async dispatch => {
    const fileName = image.split('/').pop();
    const newPath = FileSystem.documentDirectory + fileName;

    // I want to move a file here
    try {
      await FileSystem.moveAsync({
        from: image, // where the file currently sits
        to: newPath
      });
      const dbResult = await insertImage(
        title,
        newPath
      );
      console.log(dbResult);
      dispatch({ type: ADD_IMAGE, imageData: { id: dbResult.insertId, title: title, image: newPath } });
    } catch (err) {
      // console.log(err);
      throw err;
    }
  };
};


export const loadImages = () => {
  return async dispatch => {

    try {
      const dbResult = await fetchImages();
      // console.log(dbResult);
      dispatch({ type: SET_IMAGES, images: dbResult.rows._array });

    } catch (err) {
      throw err;
    }
  };

};