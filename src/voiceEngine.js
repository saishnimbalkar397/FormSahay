// src/voiceEngine.js - Web Speech API Engine (STT & TTS) for FormSahay

let activeRecognition = null;
let hasUserInteracted = false;

/**
 * Initialize audio context on first user interaction
 */
export function initializeAudio() {
  if (!hasUserInteracted) {
    hasUserInteracted = true;
    console.log('🎵 Audio initialized after user interaction');
    
    // Show available voices for debugging
    const voices = window.speechSynthesis.getVoices();
    console.log('🔍 Voice Diagnostics:');
    console.log(`   Total voices: ${voices.length}`);
    
    const marathiVoices = voices.filter(v => v.lang.startsWith('mr'));
    const hindiVoices = voices.filter(v => v.lang.startsWith('hi'));
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    
    console.log(`   Marathi voices: ${marathiVoices.length}`, marathiVoices.map(v => v.name));
    console.log(`   Hindi voices: ${hindiVoices.length}`, hindiVoices.map(v => v.name));
    console.log(`   English voices: ${englishVoices.length}`, englishVoices.map(v => v.name));
    
    // Test if TTS is working
    try {
      const testUtterance = new SpeechSynthesisUtterance('');
      testUtterance.volume = 0; // Silent test
      window.speechSynthesis.speak(testUtterance);
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('TTS initialization test failed:', e);
    }
  }
}

/**
 * Text-To-Speech (TTS): Speaks text aloud in specified language
 * @param {string} text - Prompt string to speak  
 * @param {string} lang - 'mr-IN' (Marathi) or 'hi-IN' (Hindi)
 * @returns {Promise<void>}
 */
export function speakText(text, lang = 'mr-IN') {
  return new Promise((resolve) => {
    console.log(`🔊 TTS START: "${text.substring(0, 50)}..." (${lang})`);
    
    if (!text || text.trim() === '') {
      console.warn('⚠️ Empty text provided to TTS');
      resolve();
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.error('❌ speechSynthesis not available');
      resolve();
      return;
    }

    // Ensure user interaction
    initializeAudio();

    // Force stop any ongoing speech
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Cancel failed:', e);
    }

    // Wait a moment for cancel to complete
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get and select voice
      const voices = window.speechSynthesis.getVoices();
      console.log(`🎤 Total voices: ${voices.length}`);
      
      if (voices.length === 0) {
        console.warn('⚠️ No voices available, proceeding with default');
      } else {
        // List all available voices for debugging
        const langPrefix = lang.split('-')[0];
        const relevantVoices = voices.filter(v => 
          v.lang === lang || 
          v.lang.startsWith(langPrefix) || 
          v.lang.startsWith('en') || 
          v.lang.startsWith('hi')
        );
        
        console.log('🎤 Relevant voices:', relevantVoices.map(v => `${v.name} (${v.lang})`));
        
        // Try to find best voice
        let selectedVoice = null;
        
        // 1. Exact language match
        selectedVoice = voices.find(v => v.lang === lang);
        if (selectedVoice) {
          console.log(`✅ Exact match: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
          // 2. Language prefix match
          selectedVoice = voices.find(v => v.lang.startsWith(langPrefix));
          if (selectedVoice) {
            console.log(`⚠️ Prefix match: ${selectedVoice.name} (${selectedVoice.lang})`);
          } else {
            // 3. For Marathi, try Hindi as closer alternative
            if (lang === 'mr-IN') {
              selectedVoice = voices.find(v => v.lang.startsWith('hi'));
              if (selectedVoice) {
                console.log(`🔄 Marathi not available, using Hindi: ${selectedVoice.name} (${selectedVoice.lang})`);
              }
            }
            
            // 4. English fallback
            if (!selectedVoice) {
              selectedVoice = voices.find(v => v.lang.startsWith('en'));
              if (selectedVoice) {
                console.log(`🔄 English fallback: ${selectedVoice.name} (${selectedVoice.lang})`);
              }
            }
            
            // 5. First available voice
            if (!selectedVoice && voices.length > 0) {
              selectedVoice = voices[0];
              console.log(`🎤 Default voice: ${selectedVoice?.name} (${selectedVoice?.lang})`);
            }
          }
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Track if TTS actually started
      let speechStarted = false;
      let speechEnded = false;
      
      utterance.onstart = () => {
        speechStarted = true;
        console.log('🎵 TTS STARTED');
      };

      utterance.onend = () => {
        if (!speechEnded) {
          speechEnded = true;
          console.log('✅ TTS COMPLETED');
          resolve();
        }
      };
      
      utterance.onerror = (event) => {
        if (!speechEnded) {
          speechEnded = true;
          console.error('❌ TTS ERROR:', event.error);
          resolve();
        }
      };

      // Emergency timeout
      const timeout = setTimeout(() => {
        if (!speechStarted || !speechEnded) {
          console.warn('⏰ TTS TIMEOUT - forcing completion');
          try {
            window.speechSynthesis.cancel();
          } catch (e) {}
          if (!speechEnded) {
            speechEnded = true;
            resolve();
          }
        }
      }, 10000); // 10 second timeout

      // Start speaking
      try {
        console.log('🚀 Calling speechSynthesis.speak()...');
        window.speechSynthesis.speak(utterance);
        
        // Check if it started within 1 second
        setTimeout(() => {
          console.log(`📊 Status after 1s: speaking=${window.speechSynthesis.speaking}, pending=${window.speechSynthesis.pending}`);
          
          if (!speechStarted && !window.speechSynthesis.speaking) {
            console.warn('⚠️ TTS may not have started - trying to resume');
            try {
              window.speechSynthesis.resume();
            } catch (e) {
              console.warn('Resume failed:', e);
            }
          }
        }, 1000);
        
      } catch (err) {
        clearTimeout(timeout);
        if (!speechEnded) {
          speechEnded = true;
          console.error('❌ speechSynthesis.speak() failed:', err);
          resolve();
        }
      }
      
    }, 100); // Wait 100ms for cancel to complete
  });
}

/**
 * Speech-To-Text (STT): Listens to microphone audio and streams transcript
 * @param {string} lang - 'mr-IN' or 'hi-IN'
 * @param {function} onTranscript - Callback (text, isFinal)
 * @param {function} onError - Error handler
 */
export function startListening(lang = 'mr-IN', onTranscript, onError) {
  stopListening();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (onError) onError('Web Speech API (STT) is not supported in this browser. Use Google Chrome.');
    return null;
  }

  try {
    activeRecognition = new SpeechRecognition();
    activeRecognition.lang = lang;
    activeRecognition.continuous = false;
    activeRecognition.interimResults = true;

    activeRecognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      const cleanText = convertSpokenNumbers(text);
      onTranscript(cleanText, Boolean(finalTranscript));
    };

    activeRecognition.onerror = (event) => {
      console.warn('Speech recognition error event:', event.error);
      if (onError && event.error !== 'no-speech') {
        onError(`Speech Recognition Error: ${event.error}`);
      }
    };

    activeRecognition.start();
    return activeRecognition;
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    if (onError) onError('Microphone access failed or already active.');
    return null;
  }
}

/**
 * Stop active speech recognition safely
 */
export function stopListening() {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch (e) {
      // Ignore if already stopped
    }
    activeRecognition = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Force TTS to work by trying multiple strategies
 * Special version for reading questions automatically
 */
export function forceReadQuestion(text, lang = 'mr-IN') {
  return new Promise(async (resolve) => {
    console.log(`🎯 FORCE READ QUESTION: "${text.substring(0, 50)}..." (${lang})`);
    
    if (!text || !text.trim()) {
      console.warn('Empty question text');
      resolve();
      return;
    }

    // Check available voices first
    const voices = window.speechSynthesis.getVoices();
    console.log(`🎤 Available voices: ${voices.length}`);
    
    // Check if we have the requested language
    const hasExactLang = voices.some(v => v.lang === lang);
    const hasLangPrefix = voices.some(v => v.lang.startsWith(lang.split('-')[0]));
    
    console.log(`🔍 Voice availability for ${lang}:`);
    console.log(`   Exact match (${lang}): ${hasExactLang}`);
    console.log(`   Prefix match (${lang.split('-')[0]}): ${hasLangPrefix}`);

    // Strategy 1: Try with requested language (even if no native voice - will fallback to English)
    try {
      console.log(`📢 Strategy 1: Try ${lang} (with English fallback)`);
      await speakText(text, lang);
      console.log('✅ Strategy 1 succeeded');
      resolve();
      return;
    } catch (err) {
      console.warn('Strategy 1 failed:', err);
    }

    // Strategy 2: If Marathi requested but not available, try Hindi
    if (lang === 'mr-IN' && !hasExactLang && !hasLangPrefix) {
      const hasHindi = voices.some(v => v.lang.startsWith('hi'));
      if (hasHindi) {
        try {
          console.log('📢 Strategy 2: Marathi not available, trying Hindi voice');
          await speakText(text, 'hi-IN');
          console.log('✅ Strategy 2 (Hindi fallback) succeeded');
          resolve();
          return;
        } catch (err) {
          console.warn('Strategy 2 failed:', err);
        }
      }
    }

    // Strategy 3: Force English voice
    try {
      console.log('📢 Strategy 3: Force English voice');
      await speakText(text, 'en-US');
      console.log('✅ Strategy 3 (English) succeeded');
      resolve();
      return;
    } catch (err) {
      console.warn('Strategy 3 failed:', err);
    }

    // Strategy 4: Simple direct speak with any available voice
    try {
      console.log('📢 Strategy 4: Direct speak with default voice');
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.volume = 1.0;
      
      // Use first available voice
      if (voices.length > 0) {
        utterance.voice = voices[0];
        console.log(`🎤 Using default voice: ${voices[0].name} (${voices[0].lang})`);
      }
      
      let completed = false;
      
      utterance.onend = () => {
        if (!completed) {
          completed = true;
          console.log('✅ Strategy 4 (direct speak) succeeded');
          resolve();
        }
      };
      
      utterance.onerror = () => {
        if (!completed) {
          completed = true;
          console.warn('Strategy 4 failed');
          resolve();
        }
      };
      
      window.speechSynthesis.speak(utterance);
      
      // Timeout for direct speak
      setTimeout(() => {
        if (!completed) {
          completed = true;
          console.warn('Strategy 4 timeout');
          resolve();
        }
      }, 8000);
      
    } catch (err) {
      console.error('All TTS strategies failed:', err);
      resolve();
    }
  });
}

/**
 * Converts Devanagari numerals and spoken Marathi/Hindi numbers into standard digits
 * Only replaces whole words to avoid corrupting names or other text
 */
export function convertSpokenNumbers(text) {
  if (!text) return '';

  const devanagariDigits = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  let converted = text.replace(/[०-९]/g, match => devanagariDigits[match]);

  const wordMap = {
    'पासष्ट': '65', 'सहाष्ट': '66', 'सदुसष्ट': '67', 'अडसष्ट': '68', 'एकोणसत्तर': '69',
    'साठ': '60', 'सत्तर': '70', 'ऐंशी': '80', 'नव्वद': '90', 'शंभर': '100',
    'पैंसठ': '65', 'छियासठ': '66', 'सरसठ': '67', 'अड़सठ': '68', 'उनहत्तर': '69'
  };

  Object.keys(wordMap).forEach(word => {
    const pattern = new RegExp('(^|[\\s,.;:!?\\-])' + escapeRegExp(word) + '($|[\\s,.;:!?\\-])', 'g');
    converted = converted.replace(pattern, '$1' + wordMap[word] + '$2');
  });

  return converted.trim();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}