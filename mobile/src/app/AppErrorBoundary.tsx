import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { color, font } from '../theme';
import { Press } from '../components/ui/Press';

/** A render failure must be visible in release builds as well as development. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Orbit render failed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }} style={{ backgroundColor: color.bg }}>
        <Text style={font('title')}>No pudimos abrir esta pantalla</Text>
        <Text style={font('body', color.muted)}>Tus registros siguen guardados. Puedes intentar cargarla otra vez.</Text>
        <View style={{ padding: 16, backgroundColor: color.surface, borderRadius: 12 }}>
          <Text selectable style={font('small', color.muted)}>{this.state.error.message}</Text>
        </View>
        <Press label="Reintentar" onPress={() => this.setState({ error: null })} style={{ padding: 16, backgroundColor: color.accent, borderRadius: 12 }}>
          <Text style={font('button', color.onAccent)}>Reintentar</Text>
        </Press>
      </ScrollView>
    );
  }
}
