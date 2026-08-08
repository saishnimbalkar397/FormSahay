const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const VALID_ACTIONS = [
  'EXPLAIN_FIELD',
  'CLARIFY_INPUT',
  'SUGGEST_VALUE',
  'AUTO_FILL_FIELD',
  'VALIDATE_FIELD',
  'WARN_INVALID',
  'NEXT_STEP',
  'PREV_STEP',
  'START_FORM',
  'GENERATE_PDF',
  'REPEAT_PROMPT',
  'SUGGEST_PRESET',
  'OPEN_SCHEME',
  'NONE',
];
const DEFAULT_ACTION = 'NONE';
const MODEL_NAME = 'gemini-2.0-flash-exp';

const SCHEME_LOOKUP = {
  SENIOR_CITIZEN_CERTIFICATE: {
    name: 'Senior Citizen Certificate (Maharashtra Maha Seva Kendra)',
    eligibility_mr: 'वय ६० वर्षे किंवा त्याहून अधिक, महाराष्ट्र राज्याचे निवासी',
    eligibility_hi: 'आयु ६० वर्ष या उससे अधिक, महाराष्ट्र राज्य के निवासी',
    age_required_min: 60,
    required_docs: ['Aadhaar Card', 'Age Proof (Birth Certificate / School Leaving / PAN)', 'Residence Proof'],
  },
  ATAL_PENSION_YOJANA: {
    name: 'Atal Pension Yojana (APY) Registration',
    eligibility_mr: 'वय १८ ते ४० वर्षे, बचत बँक खाते असणे आवश्यक',
    eligibility_hi: 'आयु १८ से ४० वर्ष, बचत बैंक खाता होना अनिवार्य',
    age_required_min: 18,
    age_required_max: 40,
    required_docs: ['Bank A/c with IFSC', 'Aadhaar', 'Mobile linked to Aadhaar'],
  },
};

function getAgeFromDob(dobStr) {
  if (!dobStr) return null;
  const match = String(dobStr).trim().match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!match) return null;
  let [, d, m, y] = match;
  d = parseInt(d, 10);
  m = parseInt(m, 10);
  y = parseInt(y, 10);
  if (y < 100) y += (y < 50 ? 2000 : 1900);
  const birth = new Date(y, m - 1, d);
  if (isNaN(birth.getTime())) return null;
  const ms = Date.now() - birth.getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
}

function validateFieldByRules(field, value, schemeId) {
  const v = String(value || '').trim();
  if (!v) return { ok: false, reason_mr: 'रिक्त आहे.', reason_hi: 'खाली है।', reason_en: 'Field is empty.' };
  const digitsOnly = v.replace(/\D/g, '');
  switch (field && field.field_key) {
    case 'aadhaar_number':
      if (digitsOnly.length !== 12) {
        return { ok: false, reason_mr: 'आधार क्रमांक १२ अंकी असणे आवश्यक आहे.', reason_hi: 'आधार नंबर १२ अंक का होना चाहिए।', reason_en: 'Aadhaar must be exactly 12 digits.' };
      }
      return { ok: true };
    case 'mobile_number':
    case 'emergency_mobile': {
      const ok = digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly);
      if (!ok) {
        return { ok: false, reason_mr: 'मोबाइल १० अंकी असणे आणि ६,७,८,९ ने सुरू होणे आवश्यक.', reason_hi: 'मोबाइल १० अंकों का होना और ६,७,८,९ से शुरू होना चाहिए।', reason_en: 'Mobile must be 10 digits starting with 6-9.' };
      }
      return { ok: true };
    }
    case 'dob': {
      const age = getAgeFromDob(v);
      if (age === null) {
        return { ok: false, reason_mr: 'जन्मतारीख DD/MM/YYYY स्वरूपात द्या.', reason_hi: 'जन्म तिथि DD/MM/YYYY प्रारूप में दें।', reason_en: 'Date must be DD/MM/YYYY.' };
      }
      if (schemeId === 'SENIOR_CITIZEN_CERTIFICATE' && age < 60) {
        return { ok: false, reason_mr: `वय ${age} वर्षे. ज्येष्ठ नागरिक योजनेसाठी ६० वर्षे लागतात.`, reason_hi: `आयु ${age} वर्ष. वरिष्ठ नागरिक योजना के लिए ६० वर्ष चाहिए.`, reason_en: `Age ${age}. Senior Citizen scheme requires age >= 60.` };
      }
      if (schemeId === 'ATAL_PENSION_YOJANA' && (age < 18 || age > 40)) {
        return { ok: false, reason_mr: `वय ${age} वर्षे. APY साठी १८ ते ४० असणे आवश्यक.`, reason_hi: `आयु ${age} वर्ष. APY के लिए १८-४० होना ज़रूरी.`, reason_en: `Age ${age}. APY needs 18 to 40.` };
      }
      return { ok: true, age };
    }
    case 'pension_amount': {
      const allowed = ['1000', '2000', '3000', '5000'];
      if (!allowed.includes(digitsOnly)) {
        return { ok: false, reason_mr: 'पेन्शन १०००, २०००, ३००० किंवा ५००० असणे आवश्यक.', reason_hi: 'पेंशन १०००, २०००, ३००० या ५००० होनी चाहिए.', reason_en: 'Pension must be 1000 / 2000 / 3000 / 5000.' };
      }
      return { ok: true };
    }
    case 'bank_account':
      if (digitsOnly.length < 8 || digitsOnly.length > 18) {
        return { ok: false, reason_mr: 'बँक खाते क्रमांक ८ ते १८ अंकी असणे आवश्यक.', reason_hi: 'बैंक खाता संख्या ८ से १८ अंकों की होनी चाहिए।', reason_en: 'Bank account should be 8 to 18 digits.' };
      }
      return { ok: true };
    default:
      return { ok: true };
  }
}

function localizeReply(lang, mr, hi, en) {
  const l = String(lang || 'mr-IN').toLowerCase();
  if (l.startsWith('mr')) return mr;
  if (l.startsWith('hi')) return hi;
  return en;
}

function buildSystemPrompt() {
  return [
    'You are FormSahay AI — a multilingual (Marathi, Hindi, English) voice assistant for elderly and rural Indian users filling government welfare forms.',
    '',
    'RESPOND ONLY WITH RAW JSON. No markdown, no ```json fences, no prefix text.',
    '',
    'RESPONSE SCHEMA:',
    '{',
    '  "reply": "one or two SHORT sentences in Marathi or Hindi or English based on the user language",',
    '  "action": "EXPLAIN_FIELD | CLARIFY_INPUT | SUGGEST_VALUE | AUTO_FILL_FIELD | VALIDATE_FIELD | WARN_INVALID | NEXT_STEP | PREV_STEP | START_FORM | GENERATE_PDF | REPEAT_PROMPT | SUGGEST_PRESET | OPEN_SCHEME | NONE",',
    '  "suggestedValue": "optional — only if SUGGEST_VALUE or AUTO_FILL_FIELD",',
    '  "fieldToFill": "optional — field key for AUTO_FILL_FIELD"',
    '}',
    '',
    'ACTION RULES:',
    '- EXPLAIN_FIELD: user asked what this field means, why it is needed, samajh nahi aaya, kay aahe',
    '- CLARIFY_INPUT: spoken transcript is ambiguous, short question to clarify',
    '- SUGGEST_VALUE: misheard speech likely has a corrected canonical value',
    '- AUTO_FILL_FIELD: ONLY when user said a clear value for the current field (then include suggestedValue + fieldToFill)',
    '- VALIDATE_FIELD: user asked is-this-OK / confirm, run field validation checks below',
    '- WARN_INVALID: current filled value fails format/eligibility rules',
    '- NEXT_STEP: pudhe ja, aage badho, next',
    '- PREV_STEP: maga ja, pichla, previous',
    '- START_FORM: user says which scheme to begin',
    '- GENERATE_PDF: print / download PDF',
    '- REPEAT_PROMPT: punha sanga, dohrayen, repeat question',
    '- SUGGEST_PRESET: user wants demo preset during hackathon',
    '- OPEN_SCHEME: switch schemes',
    '- NONE: chit-chat, thanks, hello',
    '',
    'RULES FOR reply:',
    '1. Match the language of userMessage: if Devanagari + mr-IN reply Marathi, if Devanagari + hi-IN reply Hindi, otherwise English or same script as userMessage.',
    '2. Keep reply <= 2 short sentences — voice-first, elderly-friendly, slow and clear speech.',
    '3. DO NOT use jargon or acronyms.',
    '',
    'VALIDATION RULES (used for VALIDATE_FIELD / WARN_INVALID):',
    '- Aadhaar: exactly 12 digits',
    '- Mobile / emergency mobile: 10 digits starting with 6,7,8,9',
    '- Senior Citizen DOB: age >= 60 years as of today',
    '- APY DOB: age between 18 and 40 inclusive',
    '- APY pension: 1000 / 2000 / 3000 / 5000 only',
    '- Bank account number: 8-18 digits',
    '',
    'End of instructions. Output only JSON.',
  ].join('\n');
}

router.post('/', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'GEMINI_API_KEY / GOOGLE_API_KEY not configured',
      reply: localizeReply(req.body && req.body.selectedLanguage,
        'तंत्रज्ञान सेवा सुरू नाही. API की कॉन्फिगर करा.',
        'AI सेवा शुरू नहीं है। API की कॉन्फिगर करें।',
        'AI service not configured. Please set GEMINI_API_KEY.'),
      action: DEFAULT_ACTION,
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const body = req.body || {};
  const {
    message,
    selectedLanguage = 'mr-IN',
    activeSchemeId = null,
    currentQuestion = null,
    formDataSnapshot = {},
    conversationHistory = [],
  } = body;

  const userMessage = String(message || '').trim();

  if (!userMessage && !currentQuestion) {
    return res.status(400).json({ success: false, error: 'message or currentQuestion is required' });
  }

  console.log(`\n[AI-CHAT] lang=${selectedLanguage} scheme=${activeSchemeId} field=${currentQuestion?.field_key || '(dashboard)'}`);
  console.log(`         user: "${userMessage.substring(0, 100)}"`);

  const lowered = userMessage.toLowerCase();

  const fast = [
    { re: /next|pudhe|aage|पुढे|आगे|agge/, act: 'NEXT_STEP',
      mr: 'ठीक आहे, पुढील प्रश्नाकडे जात आहे.',
      hi: 'ठीक है, अगले प्रश्न की तरफ जा रहा हूँ।',
      en: 'Moving to the next question.' },
    { re: /previous|mage|मागे|पूर्व|पिछला|pichla|pichhle/, act: 'PREV_STEP',
      mr: 'मागील प्रश्नाकडे परत जात आहे.',
      hi: 'पिछले प्रश्न पर वापस जा रहे हैं।',
      en: 'Going back to previous question.' },
    { re: /repeat|पुन्हा|punha|phir|फिर|दोहरा|dobara|दोबारा/, act: 'REPEAT_PROMPT',
      mr: 'ठीक आहे, प्रश्न पुन्हा वाचत आहे.',
      hi: 'ठीक है, सवाल दोहरा रहा हूँ।',
      en: 'Repeating the question now.' },
    { re: /download|pdf|print|पीडीएफ|प्रिंट|मुद्रित|mudrit/, act: 'GENERATE_PDF',
      mr: 'तुमचा फॉर्म PDF तयार होत आहे.',
      hi: 'आपका फॉर्म PDF तैयार हो रहा है।',
      en: 'Preparing your PDF form.' },
  ];
  for (const f of fast) {
    if (userMessage && f.re.test(lowered)) {
      return res.json({ success: true, reply: localizeReply(selectedLanguage, f.mr, f.hi, f.en), action: f.act });
    }
  }

  const validationRe = /^(validate|valid|सही|sahi|correct|बरोबर|barobar|चांगले|ok|ठीक|theek|right)[\s?.!]*$/;
  const wantsValidation = (userMessage && (validationRe.test(lowered) || /valid|correct|बरोबर|सही/.test(lowered)));
  if (currentQuestion && wantsValidation) {
    const vr = validateFieldByRules(currentQuestion, formDataSnapshot[currentQuestion.field_key], activeSchemeId);
    if (vr.ok) {
      const reply = localizeReply(selectedLanguage,
        'हे मूल्य बरोबर आहे. पुढे जाऊ शकता.',
        'यह मान सही है। आप आगे बढ़ सकते हैं।',
        'This value looks correct. You may proceed.');
      return res.json({ success: true, reply, action: 'VALIDATE_FIELD' });
    } else {
      const reason = localizeReply(selectedLanguage, vr.reason_mr, vr.reason_hi, vr.reason_en);
      const prefix = localizeReply(selectedLanguage, 'त्रुटी: ', 'त्रुटि: ', 'Issue: ');
      return res.json({ success: true, reply: prefix + reason, action: 'WARN_INVALID' });
    }
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.18,
        topK: 16,
        topP: 0.88,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    });

    const schemeInfo = activeSchemeId && SCHEME_LOOKUP[activeSchemeId] ? SCHEME_LOOKUP[activeSchemeId] : null;
    const sys = buildSystemPrompt();
    const ctx = JSON.stringify({
      selectedLanguage,
      activeSchemeId,
      schemeInfo,
      currentQuestion,
      formDataSnapshot,
      today_date: new Date().toISOString().slice(0, 10),
    });
    const hist = (conversationHistory || []).slice(-6).map(t => `[${t.role}] ${t.content}`).join('\n');

    const promptText =
      sys +
      '\n\n======== CONTEXT OBJECT (JSON) =========\n' + ctx +
      '\n\n======== CONVERSATION HISTORY (LAST 6) =========\n' + hist +
      `\n\n======== USER MESSAGE =========\n${userMessage || '(none, user wants validation of current field)'}` +
      '\n\nReply ONLY with JSON matching the schema above.';

    const out = await model.generateContent(promptText);
    let rawText = await out.response.text();
    console.log(`[GEMINI-RAW] ${rawText.substring(0, 300)}`);

    let parsed = null;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e1) {
      try {
        const m = rawText.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : null;
      } catch (e2) {
        parsed = null;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return res.json({
        success: true,
        reply: localizeReply(selectedLanguage,
          'मला समजले नाही. कृपया थोडे स्पष्टपणे सांगा.',
          'मुझे समझ में नहीं आया. कृपया स्पष्ट बोलें।',
          "I didn't understand that clearly. Could you rephrase?"),
        action: 'CLARIFY_INPUT',
      });
    }

    let reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    let action = typeof parsed.action === 'string' ? String(parsed.action).toUpperCase() : DEFAULT_ACTION;
    if (!VALID_ACTIONS.includes(action)) action = DEFAULT_ACTION;
    const suggestedValue = typeof parsed.suggestedValue === 'string' ? parsed.suggestedValue : undefined;
    let fieldToFill = typeof parsed.fieldToFill === 'string' ? parsed.fieldToFill : undefined;
    if (action === 'AUTO_FILL_FIELD' && !fieldToFill && currentQuestion) fieldToFill = currentQuestion.field_key;

    if (!reply) {
      reply = localizeReply(selectedLanguage,
        'मी समजले नाही. कृपया पुन्हा सांगा.',
        'मुझे समझ में नहीं आया. कृपया दोहराएं।',
        "I didn't catch that. Please repeat.");
    }

    return res.json({ success: true, reply, action, suggestedValue, fieldToFill });
  } catch (err) {
    console.error('[GEMINI-ERR]', err && err.message ? err.message : err);
    return res.status(200).json({
      success: false,
      error: err && err.message ? err.message : 'Gemini call failed',
      reply: localizeReply(selectedLanguage,
        'सेवा तात्पुरती बंद आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा किंवा तोंडी उत्तर द्या.',
        'AI सेवा थोड़ी देर के लिए बंद है। कृपया देर में प्रयास करें या सीधा जवाब दें।',
        'AI service is briefly unavailable. Please retry shortly, or answer directly by voice.'),
      action: DEFAULT_ACTION,
    });
  }
});

module.exports = router;
