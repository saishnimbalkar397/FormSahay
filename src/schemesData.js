// src/schemesData.js - Extracted Schemes & HTML Area Map Calibrated Coordinates
// Each field's html_map defines the blank fill box next to its printed heading.
// pdf_x / pdf_y are derived at runtime via pdfCoords.js (MAP_OFFSET = 67, A4 height).

export const SCHEMES = [
  {
    id: 'SENIOR_CITIZEN_CERTIFICATE',
    code: 'MH_SR_CITIZEN_CERT',
    title_mr: 'ज्येष्ठ नागरिक प्रमाणपत्र अर्ज (Maha Seva Kendra)',
    title_hi: 'वरिष्ठ नागरिक प्रमाण पत्र आवेदन (महा सेवा केंद्र)',
    title_en: 'Senior Citizen Certificate Application Form',
    department: 'महसूल व विशेष सहाय्य विभाग (महाराष्ट्र)',
    state: 'Maharashtra',
    category: 'Senior Citizens / Certification',
    estimatedTime: '3 Mins',
    icon: '👴',
    badge: 'Uploaded Form 1',
    benefits: 'Official Government Senior Citizen Identity Card & Welfare Benefits',
    pdf_template_url: '/templates/Senior_Citizen_Certificate_Form.pdf'
  },
  {
    id: 'ATAL_PENSION_YOJANA',
    code: 'APY_REGISTRATION_FORM',
    title_mr: 'अटल पेन्शन योजना (APY) नोंदणी अर्ज',
    title_hi: 'अटल पेंशन योजना (APY) पंजीकरण फॉर्म',
    title_en: 'Atal Pension Yojana (APY) Subscriber Form',
    department: 'Pension Fund Regulatory and Development Authority (PFRDA)',
    state: 'All India',
    category: 'Pension & Social Security',
    estimatedTime: '4 Mins',
    icon: '🏦',
    badge: 'Uploaded Form 2',
    benefits: 'Guaranteed Monthly Pension of ₹1,000 to ₹5,000 after 60 years of age',
    pdf_template_url: '/templates/Atal_Pension_Yojana_Form.pdf'
  }
];

export const QUESTIONS_BY_SCHEME = {
  // SCHEME 1: SENIOR CITIZEN CERTIFICATE (MH MAHA SEVA KENDRA)
  SENIOR_CITIZEN_CERTIFICATE: [
    {
      id: 'aadhaar_number',
      step: 1,
      field_key: 'aadhaar_number',
      label_mr: 'आधार क्रमांक',
      label_hi: 'आधार कार्ड नंबर',
      label_en: 'Aadhaar Number',
      prompt_mr: 'कृपया अर्जदाराचा १२ अंकी आधार क्रमांक सांगा. उदाहरण: ९८४५ १२३४ ५६७८.',
      prompt_hi: 'कृपया आवेदक का १२ अंकों का आधार कार्ड नंबर बताएं। उदाहरण: ९८४५ १२३४ ५६७८।',
      inputType: 'number',
      placeholder: 'XXXX-XXXX-XXXX',
      pdf_page: 1,
      html_map: { x1: 123, y1: 126, x2: 470, y2: 140 }
    },
    {
      id: 'applicant_name',
      step: 2,
      field_key: 'applicant_name',
      label_mr: 'संपूर्ण नाव',
      label_hi: 'पूरा नाम',
      label_en: 'Full Name of Applicant',
      prompt_mr: 'कृपया अर्जदाराचे आधार कार्डावरील संपूर्ण नाव सांगा. उदाहरण: शांताराम तुकाराम पाटील.',
      prompt_hi: 'कृपया आवेदक का आधार कार्ड के अनुसार पूरा नाम बताएं। उदाहरण: शांताराम तुकाराम पाटील।',
      inputType: 'text',
      placeholder: 'उदा. शांताराम तुकाराम पाटील',
      pdf_page: 1,
      html_map: { x1: 123, y1: 149, x2: 470, y2: 163 }
    },
    {
      id: 'gender',
      step: 3,
      field_key: 'gender',
      label_mr: 'लिंग',
      label_hi: 'लिंग',
      label_en: 'Gender',
      prompt_mr: 'कृपया तुमचे लिंग निवडा. पुरुष, स्त्री, किंवा इतर यापैकी एक निवडा.',
      prompt_hi: 'कृपया अपना लिंग चुनें। पुरुष, महिला, या अन्य में से एक चुनें।',
      inputType: 'select',
      options: [
        { value: '✓ (पुरुष)', label_mr: 'पुरुष', label_hi: 'पुरुष', html_map: { x1: 248, y1: 173, x2: 262, y2: 187 } },
        { value: '✓ (स्त्री)', label_mr: 'स्त्री', label_hi: 'महिला', html_map: { x1: 318, y1: 173, x2: 332, y2: 187 } },
        { value: '✓ (इतर)', label_mr: 'इतर', label_hi: 'अन्य', html_map: { x1: 388, y1: 173, x2: 402, y2: 187 } }
      ],
      pdf_page: 1,
      html_map: { x1: 123, y1: 173, x2: 470, y2: 187 }
    },
    {
      id: 'dob',
      step: 4,
      field_key: 'dob',
      label_mr: 'जन्मतारीख',
      label_hi: 'जन्म तिथि',
      label_en: 'Date of Birth (DD/MM/YYYY)',
      prompt_mr: 'कृपया तुमची जन्मतारीख सांगा. दिनांक, महिना आणि वर्ष या स्वरूपात. उदाहरण: १५ ऑगस्ट १९५८.',
      prompt_hi: 'कृपया अपनी जन्म तिथि बताएं। दिनांक, महीना और वर्ष के रूप में। उदाहरण: १५ अगस्त १९५८।',
      inputType: 'text',
      placeholder: 'उदा. 15/08/1958',
      pdf_page: 1,
      html_map: { x1: 123, y1: 197, x2: 470, y2: 211 }
    },
    {
      id: 'blood_group',
      step: 5,
      field_key: 'blood_group',
      label_mr: 'रक्तगट',
      label_hi: 'रक्त समूह',
      label_en: 'Blood Group',
      prompt_mr: 'कृपया तुमचा रक्तगट सांगा. उदाहरण: ओ पॉझिटिव्ह, ए पॉझिटिव्ह, बी पॉझिटिव्ह, किंवा एबी पॉझिटिव्ह.',
      prompt_hi: 'कृपया अपना रक्त समूह बताएं। उदाहरण: ओ पॉझिटिव्ह, ए पॉझिटिव्ह, बी पॉझिटिव्ह, या एबी पॉझिटिव्ह।',
      inputType: 'text',
      placeholder: 'उदा. O+',
      pdf_page: 1,
      html_map: { x1: 123, y1: 223, x2: 470, y2: 237 }
    },
    {
      id: 'address',
      step: 6,
      field_key: 'address',
      label_mr: 'निवासाचा पूर्ण पत्ता',
      label_hi: 'निवास का पूरा पता',
      label_en: 'Residential Address',
      prompt_mr: 'कृपया तुमचा निवासाचा पूर्ण पत्ता सांगा. घर क्रमांक, रस्त्याचे नाव, गाव किंवा शहर, आणि पिन कोडसह.',
      prompt_hi: 'कृपया अपने निवास का पूरा पता बताएं। मकान नंबर, सड़क का नाम, गांव या शहर, और पिन कोड के साथ।',
      inputType: 'text',
      placeholder: 'उदा. घर क्र. ४५, निफाड रोड, नाशिक',
      pdf_page: 1,
      html_map: { x1: 123, y1: 258, x2: 470, y2: 300 }
    },
    {
      id: 'mobile_number',
      step: 7,
      field_key: 'mobile_number',
      label_mr: 'भ्रमणध्वनी (मोबाइल) क्रमांक',
      label_hi: 'मोबाइल नंबर',
      label_en: 'Mobile Number',
      prompt_mr: 'कृपया तुमचा १० अंकी मोबाइल क्रमांक सांगा. उदाहरण: ९८२२१४५६७८.',
      prompt_hi: 'कृपया अपना १० अंकों का मोबाइल नंबर बताएं। उदाहरण: ९८२२१४५६७८।',
      inputType: 'number',
      placeholder: 'उदा. 9822145678',
      pdf_page: 1,
      html_map: { x1: 123, y1: 363, x2: 470, y2: 377 }
    },
    {
      id: 'emergency_name',
      step: 8,
      field_key: 'emergency_name',
      label_mr: 'तातडीच्या वेळी संपर्क व्यक्तीचे नाव',
      label_hi: 'आपातकालीन संपर्क व्यक्ति का नाम',
      label_en: 'Emergency Contact Person Name',
      prompt_mr: 'तातडीच्या प्रसंगी संपर्क साधण्यासाठी नातेवाईकाचे नाव सांगा.',
      prompt_hi: 'आपात स्थिति में संपर्क के लिए रिश्तेदार का नाम बताएं।',
      inputType: 'text',
      placeholder: 'उदा. विकास शांताराम पाटील',
      pdf_page: 1,
      html_map: { x1: 123, y1: 416, x2: 470, y2: 430 }
    },
    {
      id: 'emergency_mobile',
      step: 9,
      field_key: 'emergency_mobile',
      label_mr: 'तातडीच्या व्यक्तीचा मोबाइल क्रमांक',
      label_hi: 'आपातकालीन व्यक्ति का मोबाइल नंबर',
      label_en: 'Emergency Contact Mobile',
      prompt_mr: 'त्यांचा मोबाइल क्रमांक सांगा.',
      prompt_hi: 'उनका मोबाइल नंबर बताएं।',
      inputType: 'number',
      placeholder: 'उदा. 9876543210',
      pdf_page: 1,
      html_map: { x1: 123, y1: 441, x2: 470, y2: 455 }
    }
  ],

  // SCHEME 2: ATAL PENSION YOJANA (APY)
  ATAL_PENSION_YOJANA: [
    {
      id: 'bank_account',
      step: 1,
      field_key: 'bank_account',
      label_mr: 'बँक खाते क्रमांक',
      label_hi: 'बैंक खाता संख्या',
      label_en: 'Savings Bank Account Number',
      prompt_mr: 'तुमचा बँक खाते क्रमांक सांगा.',
      prompt_hi: 'अपना बैंक खाता नंबर बताएं।',
      inputType: 'number',
      placeholder: 'उदा. 30894512034',
      pdf_page: 1,
      html_map: { x1: 68, y1: 126, x2: 400, y2: 140 }
    },
    {
      id: 'bank_name',
      step: 2,
      field_key: 'bank_name',
      label_mr: 'बँकेचे नाव व शाखा',
      label_hi: 'बैंक का नाम और शाखा',
      label_en: 'Bank Name & Branch',
      prompt_mr: 'तुमच्या बँकेचे नाव आणि शाखेचे नाव सांगा.',
      prompt_hi: 'अपने बैंक का नाम और शाखा बताएं।',
      inputType: 'text',
      placeholder: 'उदा. State Bank of India, Nashik Main Branch',
      pdf_page: 1,
      html_map: { x1: 68, y1: 149, x2: 400, y2: 163 }
    },
    {
      id: 'applicant_name',
      step: 3,
      field_key: 'applicant_name',
      label_mr: 'अर्जदाराचे नाव',
      label_hi: 'आवेदक का पूरा नाम',
      label_en: 'Full Name of Applicant',
      prompt_mr: 'अर्जदाराचे संपूर्ण नाव सांगा.',
      prompt_hi: 'आवेदक का पूरा नाम बताएं।',
      inputType: 'text',
      placeholder: 'उदा. रामचरण देवनाथ यादव',
      pdf_page: 1,
      html_map: { x1: 68, y1: 195, x2: 400, y2: 209 }
    },
    {
      id: 'dob',
      step: 4,
      field_key: 'dob',
      label_mr: 'जन्मतारीख व वय',
      label_hi: 'जन्म तिथि व आयु',
      label_en: 'Date of Birth (DD/MM/YYYY)',
      prompt_mr: 'तुमची जन्मतारीख सांगा (वय १८ ते ४० असावे).',
      prompt_hi: 'अपनी जन्म तिथि बताएं (आयु १८ से ४० होनी चाहिए)।',
      inputType: 'text',
      placeholder: 'उदा. 12/04/1990',
      pdf_page: 1,
      html_map: { x1: 68, y1: 221, x2: 280, y2: 235 }
    },
    {
      id: 'mobile_number',
      step: 5,
      field_key: 'mobile_number',
      label_mr: 'मोबाइल क्रमांक',
      label_hi: 'मोबाइल नंबर',
      label_en: 'Mobile Number',
      prompt_mr: 'तुमचा १० अंकी मोबाइल क्रमांक सांगा.',
      prompt_hi: 'अपना १० अंकों का मोबाइल नंबर बताएं।',
      inputType: 'number',
      placeholder: 'उदा. 9765123409',
      pdf_page: 1,
      html_map: { x1: 343, y1: 221, x2: 520, y2: 235 }
    },
    {
      id: 'aadhaar_number',
      step: 6,
      field_key: 'aadhaar_number',
      label_mr: 'आधार क्रमांक',
      label_hi: 'आधार नंबर',
      label_en: 'Aadhaar Card Number',
      prompt_mr: 'तुमचा १२ अंकी आधार कार्ड क्रमांक सांगा.',
      prompt_hi: 'अपना १२ अंकों का आधार कार्ड नंबर बताएं।',
      inputType: 'number',
      placeholder: 'XXXX-XXXX-XXXX',
      pdf_page: 1,
      html_map: { x1: 343, y1: 236, x2: 520, y2: 250 }
    },
    {
      id: 'nominee_name',
      step: 7,
      field_key: 'nominee_name',
      label_mr: 'वारसाचे (नॉमिनी) नाव',
      label_hi: 'नामांकित (नॉमिनी) का नाम',
      label_en: 'Nominee Name',
      prompt_mr: 'तुमच्या वारसाचे (नॉमिनीचे) संपूर्ण नाव सांगा.',
      prompt_hi: 'अपने नामांकित (नॉमिनी) का पूरा नाम बताएं।',
      inputType: 'text',
      placeholder: 'उदा. सुनीता रामचरण यादव',
      pdf_page: 1,
      html_map: { x1: 68, y1: 301, x2: 400, y2: 315 }
    },
    {
      id: 'pension_amount',
      step: 8,
      field_key: 'pension_amount',
      label_mr: 'पेन्शनची इच्छित रक्कम (रुपये)',
      label_hi: 'वांछित पेंशन राशि (रुपये)',
      label_en: 'Desired Monthly Pension (INR)',
      prompt_mr: 'वय ६० नंतर तुम्हाला दरमहा किती पेन्शन हवी आहे: १०००, २०००, ३०००, किंवा ५००० रुपये?',
      prompt_hi: '६० वर्ष के बाद आपको प्रति माह कितनी पेंशन चाहिए: १०००, २०००, ३०००, या ५००० रुपये?',
      inputType: 'select',
      options: [
        { value: '1000', label_mr: '१,००० रु / महिना', label_hi: '१,००० रु / महीना', html_map: { x1: 263, y1: 359, x2: 277, y2: 373 } },
        { value: '2000', label_mr: '२,००० रु / महिना', label_hi: '२,००० रु / महीना', html_map: { x1: 263, y1: 373, x2: 277, y2: 387 } },
        { value: '3000', label_mr: '३,००० रु / महिना', label_hi: '३,००० रु / महीना', html_map: { x1: 263, y1: 387, x2: 277, y2: 401 } },
        { value: '5000', label_mr: '५,००० रु / महिना', label_hi: '५,००० रु / महीना', html_map: { x1: 263, y1: 401, x2: 277, y2: 415 } }
      ],
      pdf_page: 1,
      html_map: { x1: 263, y1: 373, x2: 400, y2: 387 }
    }
  ]
};

export const DEMO_PRESETS = [
  {
    name: 'Form 1: Shantabai Patil (Senior Citizen Cert - Marathi)',
    schemeId: 'SENIOR_CITIZEN_CERTIFICATE',
    lang: 'mr-IN',
    data: {
      aadhaar_number: '984512347612',
      applicant_name: 'शांताराम तुकाराम पाटील',
      gender: '✓ (स्त्री)',
      dob: '15/08/1958',
      blood_group: 'O+',
      address: 'घर क्र. ४५, निफाड रोड, नाशिक',
      mobile_number: '9822145678',
      emergency_name: 'विकास शांताराम पाटील',
      emergency_mobile: '9876543210'
    }
  },
  {
    name: 'Form 2: Ramcharan Yadav (Atal Pension APY - Hindi)',
    schemeId: 'ATAL_PENSION_YOJANA',
    lang: 'hi-IN',
    data: {
      bank_account: '30894512034',
      bank_name: 'State Bank of India, Main Branch',
      applicant_name: 'रामचरण देवनाथ यादव',
      dob: '12/04/1990',
      mobile_number: '9765123409',
      aadhaar_number: '782390124567',
      nominee_name: 'सुनीता रामचरण यादव',
      pension_amount: '2000'
    }
  }
];
