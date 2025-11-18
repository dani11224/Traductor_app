// src/components/DocAssistantPanel.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { askDocAssistant, ChatMessage } from '../lib/docAssistant';

const colors = {
  bg:"#0E1218", surface:"#121723", card:"#161B2A",
  primary:"#A5B4FC", accent:"#7ADCC4", onPrimary:"#0B0F14",
  text:"#E6EDF6", textMuted:"#A6B3C2", border:"#263243",
};

type Props = {
  contextText: string;
};

export function DocAssistantPanel({ contextText }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await askDocAssistant({
        message: userMsg.content,
        contextText,
        history: messages,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'There was an error talking to the assistant. Please try again later.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.messages}
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubbleWrapper,
              m.role === 'user' ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            <View
              style={[
                styles.bubble,
                m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={{ paddingVertical: 4, alignItems: 'center' }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              Thinking…
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TextInput
          style={styles.input}
          placeholder="Ask something about this document…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && { opacity: 0.6 }]}
          onPress={send}
          disabled={loading}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  messages: { flex: 1 },
  bubbleWrapper: {
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  bubbleLeft: { alignItems: 'flex-start' },
  bubbleRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleUser: { backgroundColor: colors.accent },
  bubbleAssistant: { backgroundColor: colors.card },
  bubbleText: {
    color: colors.text,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    marginRight: 8,
  },
  sendBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  sendText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
});
