import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Record startup stages only: never health data or crew details.
const began = Date.now();
const stages = [];
let write = Promise.resolve();
function stage(name) {
  console.warn(`[Orbit startup] ${name} +${Date.now() - began}ms`);
  stages.push({ stage: name, elapsedMs: Date.now() - began });
  const snapshot = JSON.stringify({ startedAt: new Date(began).toISOString(), stages: [...stages] });
  write = write.then(() => FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}startup.json`, snapshot)).catch(() => {});
}
stage('entry');
function Bootstrap() {
  const [App, setApp] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    stage('bootstrap-mounted');
    const timer = setTimeout(() => {
      try {
        stage('loading-features');
        const Root = require('./App').default;
        stage('features-loaded');
        setApp(() => Root);
      } catch (e) {
        stage('feature-import-failed');
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [attempt]);
  if (App) return <App />;
  return (
    <View onLayout={() => stage('bootstrap-visible')} style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '700' }}>Orbit</Text>
      {error ? <>
        <Text style={{ color: '#98989F', fontSize: 17, textAlign: 'center' }}>No pudimos iniciar la aplicación.</Text>
        <Text selectable style={{ color: '#98989F', fontSize: 13 }}>{error}</Text>
        <Pressable onPress={() => { setError(null); setAttempt(v => v + 1); }} style={{ padding: 16 }}><Text style={{ color: '#0A84FF', fontSize: 17 }}>Reintentar</Text></Pressable>
      </> : <><ActivityIndicator color="#0A84FF" /><Text style={{ color: '#98989F', fontSize: 17 }}>Preparando tu misión…</Text></>}
    </View>
  );
}
registerRootComponent(Bootstrap);
