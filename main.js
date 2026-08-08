// main.js - FormSahay Core Application Logic

import { SCHEMES, QUESTIONS_BY_SCHEME, DEMO_PRESETS } from './src/schemesData.js';
import { speakText, startListening, stopListening, initializeAudio, forceReadQuestion } from './src/voiceEngine.js';
import { generateFormPDF } from './src/pdfEngine.js';
import { getSchemes } from './src/supabaseClient.js';

// Global Application State
let activeScheme = null;
let currentQuestions = [];
let currentStepIndex = 0;
let selectedLanguage = 'mr-IN'; // 'mr-IN' (Marathi) or 'hi-IN' (Hindi)
let formData = {};
let isListening = false;
let currentPdfBlobUrl = null;
let autoReadEnabled = true; // Auto-read questions by default

// DOM Elements
const screenDashboard = document.getElementById('screen-dashboard');
const screenStudio = document.getElementById('screen-studio');
const schemesGrid = document.getElementById('schemes-grid');
const btnLangToggle = document.getElementById('btn-lang-toggle');
const currentLangText = document.getElementById('current-lang-text');
const btnAutoReadToggle = document.getElementById('btn-auto-read-toggle');
const btnTestSimpleTts = document.getElementById('btn-test-simple-tts');

const stepPill = document.getElementById('step-pill');
const promptMr = document.getElementById('prompt-mr');
const promptEn = document.getElementById('prompt-en');
const btnMic = document.getElementById('btn-mic');
const micStatusText = document.getElementById('mic-status-text');
const transcriptPreview = document.getElementById('transcript-preview');

const fallbackContainer = document.getElementById('fallback-container');
const btnPrevStep = document.getElementById('btn-prev-step');
const btnRelisten = document.getElementById('btn-relisten');
const btnNextStep = document.getElementById('btn-next-step');
const btnBackDashboard = document.getElementById('btn-back-dashboard');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const pdfPreviewIframe = document.getElementById('pdf-preview-iframe');
const btnForceReadTest = document.getElementById('btn-force-read-test');

const btnPresetModal = document.getElementById('btn-preset-modal');
const modalPresets = document.getElementById('modal-presets');
const presetList = document.getElementById('preset-list');
const btnCloseModal = document.getElementById('btn-close-modal');

// AI Assistant DOM Elements
const btnAskAI = document.getElementById('btn-ask-ai');
const aiInput = document.getElementById('ai-input');
const aiTranscript = document.getElementById('ai-transcript');
const aiSection = document.getElementById('ai-section');
const aiStatusDot = document.getElementById('ai-status-dot');
const aiStatusText = document.getElementById('ai-status-text');

// AI conversation history
let aiConversationHistory = [];

// 1. Initialize App
async function initApp() {
  // Check TTS support and show warnings if needed
  checkTTSSupport();
  
  const loadedSchemes = await getSchemes(SCHEMES);
  renderDashboard(loadedSchemes);
  renderPresetModal();
  setupEventListeners();
}

// Check browser TTS support and provide guidance
function checkTTSSupport() {
  console.log('🔍 Checking TTS support...');
  
  if (!('speechSynthesis' in window)) {
    const message = 'Text-to-Speech is not supported in your browser.\n\n' +
      'For the best experience, please use:\n' +
      '• Google Chrome\n' +
      '• Microsoft Edge\n' +
      '• Safari (iOS/macOS)\n' +
      '• Firefox (limited support)';
    
    console.error('❌ No TTS support');
    alert(message);
    return false;
  }
  
  // Check for voice synthesis
  const voices = window.speechSynthesis.getVoices();
  console.log(`✅ TTS supported. Available voices: ${voices.length}`);
  
  if (voices.length === 0) {
    console.log('⏳ Voices not loaded yet, will retry...');
  }
  
  return true;
}

// 2. Render Dashboard Schemes
function renderDashboard(schemes) {
  schemesGrid.innerHTML = schemes.map(scheme => `
    <div class="scheme-card">
      <div>
        <div class="scheme-card-header">
          <span class="scheme-icon">${scheme.icon || '📄'}</span>
          <span class="scheme-badge">${scheme.badge || 'Active'}</span>
        </div>
        <div class="scheme-title-mr">${scheme.title_mr}</div>
        <div class="scheme-title-en">${scheme.title_en}</div>
        <div class="scheme-desc">${scheme.benefits || scheme.department}</div>
        <div class="scheme-meta">
          <span>⏱️ Est. Time: ${scheme.estimatedTime || '3 Mins'}</span>
          <span>📍 ${scheme.state || 'Maharashtra'}</span>
        </div>
      </div>
      <button class="btn-select-scheme" data-scheme-id="${scheme.id}">
        Start Voice Assistant / अर्ज सुरू करा →
      </button>
    </div>
  `).join('');

  document.querySelectorAll('.btn-select-scheme').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      // Ensure audio is initialized on form selection
      initializeAudio();
      
      const schemeId = e.currentTarget.getAttribute('data-scheme-id');
      const scheme = schemes.find(s => s.id === schemeId);
      if (scheme) {
        console.log(`🎯 Starting scheme: ${scheme.title_en}`);
        await startSchemeStudio(scheme);
      }
    });
  });
}

// 3. Start Scheme Studio State
async function startSchemeStudio(scheme) {
  console.log(`🚀 Starting scheme studio for: ${scheme.title_en}`);
  
  activeScheme = scheme;
  currentQuestions = QUESTIONS_BY_SCHEME[scheme.id] || QUESTIONS_BY_SCHEME['SENIOR_CITIZEN_CERTIFICATE'];
  currentStepIndex = 0;
  formData = {};
  aiConversationHistory = [];

  // Ensure audio is ready before starting
  initializeAudio();

  // Re-enable Next button in case it was disabled from a previous completion
  btnNextStep.disabled = false;

  screenDashboard.classList.add('hidden');
  screenStudio.classList.remove('hidden');

  // Show AI Assistant section
  if (aiSection) {
    aiSection.style.display = '';
  }

  await updateLivePDFPreview();
  
  // Small delay to ensure UI is ready, then load first question
  setTimeout(() => {
    loadQuestionStep(currentStepIndex);
  }, 300);
}

// 4. Load & Render Question Step
async function loadQuestionStep(index) {
  if (index < 0 || index >= currentQuestions.length) return;
  currentStepIndex = index;
  const q = currentQuestions[index];

  // Re-enable Next button when navigating to any question
  btnNextStep.disabled = false;

  console.log(`📋 Loading question ${index + 1}: ${q.field_key}`);
  console.log(`🔊 Auto-read enabled: ${autoReadEnabled}`);
  
  stepPill.innerText = `Question ${index + 1} of ${currentQuestions.length}`;

  promptMr.innerText = selectedLanguage === 'mr-IN' ? q.prompt_mr : q.prompt_hi;
  promptEn.innerText = `${q.label_en} (${q.placeholder || ''})`;
  transcriptPreview.innerText = formData[q.field_key] || '';

  renderFallbackUI(q);

  // Read the question if auto-read is enabled
  if (autoReadEnabled) {
    console.log('🎯 Auto-read is enabled, attempting to read question...');
    const speechText = selectedLanguage === 'mr-IN' ? q.prompt_mr : q.prompt_hi;
    console.log(`📖 Reading text: "${speechText}"`);
    console.log(`🌐 Language: ${selectedLanguage}`);
    
    // Add visual indicators
    const promptBox = document.querySelector('.prompt-box');
    if (promptBox) {
      promptBox.classList.add('reading');
    }
    if (btnRelisten) {
      btnRelisten.classList.add('reading');
      btnRelisten.innerHTML = '🔊 Reading Question...';
      btnRelisten.disabled = true;
    }
    
    // Check if we have native language support
    const voices = window.speechSynthesis.getVoices();
    const hasNativeVoice = voices.some(v => v.lang.startsWith(selectedLanguage.split('-')[0]));
    
    if (!hasNativeVoice && selectedLanguage !== 'en-US') {
      console.log('⚠️ No native voice found, will use English voice fallback');
      
      // Special handling for Marathi
      if (selectedLanguage === 'mr-IN') {
        const voices = window.speechSynthesis.getVoices();
        const hasHindi = voices.some(v => v.lang.startsWith('hi'));
        
        if (hasHindi) {
          console.log('📢 Marathi not available, but Hindi is - will use Hindi voice for better pronunciation');
        } else {
          console.log('📢 Neither Marathi nor Hindi available - will use English voice');
        }
        
        // Show one-time notification about Marathi voice
        if (!localStorage.getItem('marathiVoiceNotified')) {
          setTimeout(() => {
            alert(`🔄 Note: Marathi voice not available. Using ${hasHindi ? 'Hindi' : 'English'} voice instead.\n\nTo get native Marathi voice:\n1. Go to Windows Settings\n2. Time & Language > Speech\n3. Add Marathi language pack\n4. Restart browser`);
            localStorage.setItem('marathiVoiceNotified', 'true');
          }, 1000);
        }
      } else {
        // Show one-time notification about English fallback
        if (!localStorage.getItem('languageFallbackNotified')) {
          setTimeout(() => {
            alert(`🔄 Note: Using English voice for ${selectedLanguage === 'mr-IN' ? 'Marathi' : 'Hindi'} text.\n\nTo get native voice support, install the language pack in Windows Settings > Time & Language > Speech.`);
            localStorage.setItem('languageFallbackNotified', 'true');
          }, 1000);
        }
      }
    }
    
    // Delay the TTS to ensure page is ready and user has interacted
    setTimeout(async () => {
      try {
        console.log('🚀 Starting to speak question (auto-read)...');
        
        // Ensure audio is initialized
        initializeAudio();
        
        await forceReadQuestion(speechText, selectedLanguage);
        console.log('✅ Question reading completed (auto-read)');
      } catch (err) {
        console.error('❌ Error reading question (auto-read):', err);
      } finally {
        // Reset visual indicators
        if (promptBox) {
          promptBox.classList.remove('reading');
        }
        if (btnRelisten) {
          btnRelisten.classList.remove('reading');
          btnRelisten.innerHTML = '🔊 Re-listen Question';
          btnRelisten.disabled = false;
        }
      }
    }, 500); // 500ms delay to ensure everything is ready
    
  } else {
    console.log('🔇 Auto-read is disabled, skipping question reading');
  }
}

// 5. Render Touch Fallback Input (Text, Select, Number)
function renderFallbackUI(q) {
  const existingVal = formData[q.field_key] || '';

  if (q.inputType === 'select' && q.options) {
    fallbackContainer.innerHTML = `
      <div class="options-grid">
        ${q.options.map(opt => `
          <button class="option-btn ${existingVal === opt.value ? 'selected' : ''}" data-val="${opt.value}">
            ${selectedLanguage === 'mr-IN' ? opt.label_mr : opt.label_hi}
          </button>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const val = e.currentTarget.getAttribute('data-val');
        formData[q.field_key] = val;
        transcriptPreview.innerText = val;
        renderFallbackUI(q);
        await updateLivePDFPreview();
      });
    });

  } else {
    const inputTypeAttr = q.inputType === 'number' ? 'tel' : 'text';
    fallbackContainer.innerHTML = `
      <input type="${inputTypeAttr}" id="input-fallback" class="input-fallback" 
             placeholder="${q.placeholder || 'Type answer here...'}">
    `;
    const input = document.getElementById('input-fallback');
    input.value = existingVal;
    input.addEventListener('input', async (e) => {
      formData[q.field_key] = e.target.value;
      transcriptPreview.innerText = e.target.value;
      await updateLivePDFPreview();
    });
  }
}

// 6. Speech Recognition Toggle
function toggleMicListening() {
  if (isListening) {
    stopListening();
    setMicState(false);
  } else {
    setMicState(true);
    const q = currentQuestions[currentStepIndex];

    startListening(selectedLanguage, async (transcript, isFinal) => {
      transcriptPreview.innerText = transcript;
      formData[q.field_key] = transcript;
      renderFallbackUI(q);
      await updateLivePDFPreview();

      if (isFinal) {
        setMicState(false);
      }
    }, (err) => {
      alert(err);
      setMicState(false);
    });
  }
}

function setMicState(listening) {
  isListening = listening;
  if (listening) {
    btnMic.classList.add('listening');
    micStatusText.innerText = '🔴 Listening... Speak into microphone now.';
  } else {
    btnMic.classList.remove('listening');
    micStatusText.innerText = 'Click Mic to Speak / बोलावयासाठी माईकवर क्लिक करा';
  }
}

// 7. Update Live PDF Preview & Save Blob URL
async function updateLivePDFPreview() {
  if (!activeScheme) return;
  try {
    const pdfUrl = await generateFormPDF(activeScheme, currentQuestions, formData);
    currentPdfBlobUrl = pdfUrl;
    pdfPreviewIframe.src = pdfUrl;
  } catch (err) {
    console.error('PDF Generation Error:', err);
  }
}

// AI Helper Functions
function setAIInput(text) {
  if (aiInput) {
    aiInput.value = text;
  }
}

async function handleAskAIClick() {
  const message = aiInput ? aiInput.value.trim() : '';
  if (!message) return;

  // Clear input
  if (aiInput) aiInput.value = '';

  // Show user message in transcript
  appendAIMessage('user', message);

  // Update AI status to processing
  setAIStatus('processing');

  // Build request payload
  const currentQuestion = currentQuestions[currentStepIndex] || null;
  const payload = {
    message,
    selectedLanguage,
    activeSchemeId: activeScheme?.id || null,
    currentQuestion,
    formDataSnapshot: { ...formData },
    conversationHistory: aiConversationHistory.slice(-6),
  };

  // Add to conversation history
  aiConversationHistory.push({ role: 'user', content: message });

  try {
    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5000';
    const res = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const reply = data.reply || 'No response from AI.';
    const action = data.action || 'NONE';

    // Show AI reply in transcript
    appendAIMessage('ai', reply);
    aiConversationHistory.push({ role: 'assistant', content: reply });

    // Handle AI actions
    switch (action) {
      case 'NEXT_STEP':
        if (currentStepIndex < currentQuestions.length - 1) {
          loadQuestionStep(currentStepIndex + 1);
        }
        break;
      case 'PREV_STEP':
        if (currentStepIndex > 0) {
          loadQuestionStep(currentStepIndex - 1);
        }
        break;
      case 'REPEAT_PROMPT': {
        const q = currentQuestions[currentStepIndex];
        if (q) {
          const speechText = selectedLanguage === 'mr-IN' ? q.prompt_mr : q.prompt_hi;
          forceReadQuestion(speechText, selectedLanguage);
        }
        break;
      }
      case 'AUTO_FILL_FIELD':
      case 'SUGGEST_VALUE': {
        const fieldKey = data.fieldToFill || currentQuestion?.field_key;
        const value = data.suggestedValue;
        if (fieldKey && value) {
          formData[fieldKey] = value;
          transcriptPreview.innerText = value;
          renderFallbackUI(currentQuestions[currentStepIndex]);
          await updateLivePDFPreview();
        }
        break;
      }
      case 'GENERATE_PDF':
        if (currentPdfBlobUrl) {
          btnDownloadPdf.click();
        }
        break;
      default:
        break;
    }

    setAIStatus('online');
  } catch (err) {
    console.error('AI Chat Error:', err);
    const errorMsg = selectedLanguage === 'mr-IN'
      ? 'AI सेवा उपलब्ध नाही. कृपया पुन्हा प्रयत्न करा.'
      : selectedLanguage === 'hi-IN'
        ? 'AI सेवा उपलब्ध नहीं है। कृपया पुनः प्रयास करें।'
        : 'AI service unavailable. Please try again.';
    appendAIMessage('ai', errorMsg);
    setAIStatus('offline');
  }
}

function appendAIMessage(role, text) {
  if (!aiTranscript) return;
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.style.padding = '6px 10px';
  div.style.borderRadius = '6px';

  if (role === 'user') {
    div.style.background = 'rgba(56, 189, 248, 0.15)';
    div.style.borderLeft = '3px solid var(--accent-cyan)';
    div.innerHTML = `<span style="font-size:0.75rem;color:var(--accent-cyan);font-weight:600;">👤 You</span><br>${text}`;
  } else {
    div.style.background = 'rgba(139, 92, 246, 0.15)';
    div.style.borderLeft = '3px solid #8b5cf6';
    div.innerHTML = `<span style="font-size:0.75rem;color:#c4b5fd;font-weight:600;">🤖 AI</span><br>${text}`;
  }

  aiTranscript.appendChild(div);
  aiTranscript.scrollTop = aiTranscript.scrollHeight;
}

function setAIStatus(status) {
  if (!aiStatusDot || !aiStatusText) return;
  switch (status) {
    case 'online':
      aiStatusDot.style.background = '#10b981';
      aiStatusText.textContent = 'Online';
      break;
    case 'processing':
      aiStatusDot.style.background = '#f59e0b';
      aiStatusText.textContent = 'Thinking...';
      break;
    case 'offline':
    default:
      aiStatusDot.style.background = '#bbb';
      aiStatusText.textContent = 'Offline';
      break;
  }
}

// 8. Event Listeners Setup
function setupEventListeners() {
  // Initialize audio on any user click
  document.addEventListener('click', initializeAudio, { once: true });
  document.addEventListener('touchstart', initializeAudio, { once: true });
  
  btnMic.addEventListener('click', toggleMicListening);

  btnLangToggle.addEventListener('click', () => {
    selectedLanguage = selectedLanguage === 'mr-IN' ? 'hi-IN' : 'mr-IN';
    currentLangText.innerText = selectedLanguage === 'mr-IN' ? 'मराठी (Marathi)' : 'हिंदी (Hindi)';
    console.log(`🌐 Language switched to: ${selectedLanguage}`);
    
    if (!screenStudio.classList.contains('hidden')) {
      console.log('🔄 Re-loading question in new language...');
      loadQuestionStep(currentStepIndex);
    }
  });

  if (btnAutoReadToggle) {
  btnAutoReadToggle.addEventListener('click', () => {
    autoReadEnabled = !autoReadEnabled;
    btnAutoReadToggle.innerHTML = autoReadEnabled 
      ? '🔊 Auto-Read: ON' 
      : '🔇 Auto-Read: OFF';
    btnAutoReadToggle.className = autoReadEnabled 
      ? 'btn-preset auto-read-enabled' 
      : 'btn-preset auto-read-disabled';
  });
  }

  // Simple TTS test (null-guarded — element may not exist in HTML)
  if (btnTestSimpleTts) {
    btnTestSimpleTts.addEventListener('click', async () => {
      btnTestSimpleTts.innerHTML = '🔊 Testing...';
      btnTestSimpleTts.disabled = true;
      
      try {
        console.log('=== SIMPLE TTS TEST ===');
        await speakText('Hello, this is a voice test.', 'en-US');
        alert('✅ Test completed! Check if you heard the voice.');
      } catch (err) {
        console.error('TTS test failed:', err);
        alert('❌ Test failed: ' + err.message);
      } finally {
        btnTestSimpleTts.innerHTML = '🔊 Test Voice';
        btnTestSimpleTts.disabled = false;
      }
    });
  }

  // Force read current question test
  if (btnForceReadTest) {
    btnForceReadTest.addEventListener('click', async () => {
      if (currentQuestions.length === 0 || currentStepIndex < 0) {
        alert('No question available. Please select a scheme first.');
        return;
      }

      const q = currentQuestions[currentStepIndex];
      const speechText = selectedLanguage === 'mr-IN' ? q.prompt_mr : q.prompt_hi;
      
      btnForceReadTest.innerHTML = '🔊 Reading...';
      btnForceReadTest.disabled = true;
      
      try {
        console.log('=== FORCE READ TEST ===');
        console.log(`Question: ${speechText}`);
        console.log(`Language: ${selectedLanguage}`);
        await forceReadQuestion(speechText, selectedLanguage);
        console.log('=== FORCE READ COMPLETED ===');
      } catch (err) {
        console.error('Force read failed:', err);
      } finally {
        btnForceReadTest.innerHTML = '🔊 Force Read Current Question';
        btnForceReadTest.disabled = false;
      }
    });
  }

  btnRelisten.addEventListener('click', async () => {
    const q = currentQuestions[currentStepIndex];
    if (q && !btnRelisten.disabled) {
      const speechText = selectedLanguage === 'mr-IN' ? q.prompt_mr : q.prompt_hi;
      
      // Add visual indicators
      const promptBox = document.querySelector('.prompt-box');
      promptBox.classList.add('reading');
      btnRelisten.classList.add('reading');
      btnRelisten.innerHTML = '🔊 Reading Question...';
      btnRelisten.disabled = true;
      
      try {
        await forceReadQuestion(speechText, selectedLanguage);
      } catch (err) {
        console.error('Error re-reading question:', err);
      } finally {
        // Reset visual indicators
        promptBox.classList.remove('reading');
        btnRelisten.classList.remove('reading');
        btnRelisten.innerHTML = '🔊 Re-listen Question';
        btnRelisten.disabled = false;
      }
    }
  });

  btnPrevStep.addEventListener('click', () => {
    if (currentStepIndex > 0) {
      console.log('⬅️ Previous button clicked');
      stopListening();
      loadQuestionStep(currentStepIndex - 1);
    }
  });

  // Enhanced Confirm & Next button functionality
  btnNextStep.addEventListener('click', async () => {
    console.log('➡️ Confirm & Next button clicked');
    // Ensure any ongoing listening is stopped
    stopListening();

    // Validate that the current question has an answer
    const currentQuestion = currentQuestions[currentStepIndex];
    const answer = formData[currentQuestion?.field_key];
    if (!answer || answer.trim() === '') {
      alert('⚠️ Please provide an answer before proceeding to the next step.');
      return;
    }

    // Update PDF preview with the latest answer
    await updateLivePDFPreview();

    // Move to next question or finish
    if (currentStepIndex < currentQuestions.length - 1) {
      loadQuestionStep(currentStepIndex + 1);
    } else {
      alert('✅ Application Form Completed! Click "Print / Download Form" to download your official filled PDF.');
      // Optionally disable the button after completion
      btnNextStep.disabled = true;
    }
  });

  btnBackDashboard.addEventListener('click', () => {
    stopListening();
    screenStudio.classList.add('hidden');
    screenDashboard.classList.remove('hidden');
  });

  // Direct File Download Action
  btnDownloadPdf.addEventListener('click', () => {
    if (currentPdfBlobUrl) {
      const link = document.createElement('a');
      link.href = currentPdfBlobUrl;
      link.download = `FormSahay_${activeScheme?.code || 'Filled_Form'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Please complete at least one field to generate the PDF.');
    }
  });

  if (btnPresetModal) {
    btnPresetModal.addEventListener('click', () => modalPresets.classList.remove('hidden'));
  }
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => modalPresets.classList.add('hidden'));
  }

  if (btnAskAI) {
    btnAskAI.addEventListener('click', handleAskAIClick);
  }
  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAskAIClick();
      }
    });
  }
  document.querySelectorAll('.chip-btn[data-ai-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-ai-quick');
      switch (kind) {
        case 'explain':
          setAIInput(selectedLanguage === 'mr-IN' ? 'हा फील्ड काय आहे? सोप्या भाषेत समजवा.' : selectedLanguage === 'hi-IN' ? 'यह फ़ील्ड क्या है? सरल भाषा में समझाएं.' : 'Explain what this field means in simple terms.');
          handleAskAIClick();
          break;
        case 'validate':
          setAIInput(selectedLanguage === 'mr-IN' ? 'हे मूल्य बरोबर आहे का?' : selectedLanguage === 'hi-IN' ? 'क्या यह मान सही है?' : 'Is this value correct? Validate it.');
          handleAskAIClick();
          break;
        case 'repeat':
          setAIInput(selectedLanguage === 'mr-IN' ? 'प्रश्न पुन्हा सांगा.' : selectedLanguage === 'hi-IN' ? 'सवाल दोहराएं.' : 'Repeat the question.');
          handleAskAIClick();
          break;
        case 'next':
          setAIInput(selectedLanguage === 'mr-IN' ? 'पुढील प्रश्नाकडे जा.' : selectedLanguage === 'hi-IN' ? 'अगले सवाल पर जाएं.' : 'Go to the next question.');
          handleAskAIClick();
          break;
      }
    });
  });
}

// 9. Render Hackathon Preset Modal
function renderPresetModal() {
  presetList.innerHTML = DEMO_PRESETS.map((preset, idx) => `
    <div class="preset-item" data-preset-idx="${idx}">
      <strong style="color: var(--accent-cyan);">${preset.name}</strong>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
        Click to instantly auto-fill all fields and generate ready PDF.
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const idx = e.currentTarget.getAttribute('data-preset-idx');
      const preset = DEMO_PRESETS[idx];
      if (preset) {
        modalPresets.classList.add('hidden');
        selectedLanguage = preset.lang;
        currentLangText.innerText = selectedLanguage === 'mr-IN' ? 'मराठी (Marathi)' : 'हिंदी (Hindi)';
        
        const scheme = SCHEMES.find(s => s.id === preset.schemeId) || SCHEMES[0];
        activeScheme = scheme;
        currentQuestions = QUESTIONS_BY_SCHEME[scheme.id];
        formData = { ...preset.data };

        screenDashboard.classList.add('hidden');
        screenStudio.classList.remove('hidden');

        currentStepIndex = currentQuestions.length - 1;
        loadQuestionStep(currentStepIndex);
        await updateLivePDFPreview();
      }
    });
  });
}

window.addEventListener('DOMContentLoaded', initApp);
