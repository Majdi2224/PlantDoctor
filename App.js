import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as tf from '@tensorflow/tfjs';
import { getRemedy } from './remedies';

const MODEL_INPUT_SIZE = 224;

// Loads a browser Image element for a captured photo URI so it can be read
// into a tensor. Only works on the web target (this app ships as a
// lightweight web app, not a native build - see CLAUDE.md).
function loadImageElement(uri) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}

async function classifyImage(model, labels, uri) {
  const imgElement = await loadImageElement(uri);
  const inputTensor = tf.tidy(() =>
    tf.browser
      .fromPixels(imgElement)
      .toFloat()
      .resizeBilinear([MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])
      .div(127.5)
      .sub(1)
      .expandDims(0)
  );
  const outputTensor = model.predict(inputTensor);
  const scores = await outputTensor.data();
  inputTensor.dispose();
  outputTensor.dispose();

  let bestIndex = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[bestIndex]) bestIndex = i;
  }
  return { className: labels[bestIndex] ?? 'unknown', probability: scores[bestIndex] };
}

export default function App() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(null);
  const [labels, setLabels] = useState([]);
  const [modelError, setModelError] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await tf.ready();
        const [loadedModel, metadata] = await Promise.all([
          tf.loadLayersModel('/model/model.json'),
          fetch('/model/metadata.json').then((res) => res.json()),
        ]);
        setModel(loadedModel);
        setLabels(metadata.labels);
      } catch (err) {
        setModelError('Could not load the diagnosis model. Try reloading the page.');
        console.error('Model load failed:', err);
      }
    })();
  }, []);

  const takePicture = async () => {
    setIsLoading(true);
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      setIsLoading(false);
      return;
    }

    const uri = result.assets[0].uri;
    setImage(uri);
    try {
      const prediction = await classifyImage(model, labels, uri);
      setPredictions([prediction]);
    } catch (err) {
      console.error('Classification failed:', err);
      setPredictions(null);
      setModelError('Could not analyze that photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌿 PlantDoctor</Text>
      <Text style={styles.subtitle}>Take a picture to diagnose plant diseases</Text>
      
      <Button
        title={model ? '📷 Take Plant Photo' : 'Loading model...'}
        onPress={takePicture}
        disabled={isLoading || !model}
      />

      {modelError && <Text style={styles.error}>{modelError}</Text>}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="green" />
          <Text>Analyzing your plant...</Text>
        </View>
      )}

      {image && <Image source={{ uri: image }} style={styles.image} />}

      {predictions && (() => {
        const remedy = getRemedy(predictions[0].className);
        return (
          <View style={styles.predictionBox}>
            <Text style={styles.diagnosis}>Diagnosis: {remedy.displayName}</Text>
            <Text style={styles.confidence}>Confidence: {(predictions[0].probability * 100).toFixed(2)}%</Text>
            <Text style={styles.cause}>{remedy.cause}</Text>
            <Text style={styles.advice}>🏡 Home remedy: {remedy.homeRemedy}</Text>
            <Text style={styles.advice}>🛒 Market solution: {remedy.marketRemedy}</Text>
          </View>
        );
      })()}

      {!image && !isLoading && model && (
        <Text style={styles.instruction}>Click the button above to start diagnosis</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fff0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginVertical: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'green',
  },
  predictionBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'green',
    width: '100%',
  },
  diagnosis: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  confidence: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  cause: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  advice: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  error: {
    color: '#c62828',
    marginTop: 10,
    textAlign: 'center',
  },
  instruction: {
    marginTop: 20,
    color: '#666',
    fontStyle: 'italic',
  },
});