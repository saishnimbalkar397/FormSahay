// Database of 15 Schemes with rules included locally
const schemesData = [
  {
    id: "pm_kisan",
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    description: "Income support of ₹6,000 per year to farmer families.",
    rules: { occupation: "farmer" }
  },
  {
    id: "pm_jay",
    name: "Ayushman Bharat PM-JAY",
    description: "Health insurance cover of up to ₹5 lakh per family per year.",
    rules: { maxIncome: 300000 }
  },
  {
    id: "pm_awas_gramin",
    name: "Pradhan Mantri Awas Yojana (PMAY - Gramin)",
    description: "Financial assistance for construction of pucca houses for rural households.",
    rules: { maxIncome: 200000, housingStatus: "kutcha" }
  },
  {
    id: "atal_pension",
    name: "Atal Pension Yojana (APY)",
    description: "Guaranteed pension scheme ranging from ₹1,000 to ₹5,000 per month for citizens aged 18-40.",
    rules: { minAge: 18, maxAge: 40 }
  },
  {
    id: "pm_mudra",
    name: "Pradhan Mantri MUDRA Yojana",
    description: "Collateral-free institutional loans up to ₹10 lakh for micro and small enterprises.",
    rules: { occupation: "entrepreneur" }
  },
  {
    id: "pm_svanidhi",
    name: "PM SVANidhi Scheme",
    description: "Micro-credit facility providing working capital loans to street vendors.",
    rules: { occupation: "vendor" }
  },
  {
    id: "pm_ujjwala",
    name: "Pradhan Mantri Ujjwala Yojana (PMUY)",
    description: "Free LPG connections to women from low-income households.",
    rules: { maxIncome: 200000, gender: "female" }
  },
  {
    id: "pm_kv_yojana",
    name: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)",
    description: "Industry-relevant skill development training and certification for youth.",
    rules: { maxAge: 35, occupation: "student" }
  },
  {
    id: "nsap_pension",
    name: "National Social Assistance Programme (NSAP)",
    description: "Financial pension support for elderly citizens, widows, and persons with disabilities.",
    rules: { minAge: 60, maxIncome: 100000 }
  },
  {
    id: "pm_matru_vandana",
    name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
    description: "Maternity benefit cash incentive of ₹5,000 for pregnant and lactating mothers.",
    rules: { gender: "female", occupation: "pregnant" }
  },
  {
    id: "post_matric_sc",
    name: "Post Matric Scholarship for SC Students",
    description: "Financial assistance for higher education to students belonging to Scheduled Castes.",
    rules: { caste: "sc", occupation: "student", maxIncome: 250000 }
  },
  {
    id: "post_matric_st",
    name: "Post Matric Scholarship for ST Students",
    description: "Financial assistance for higher education to students belonging to Scheduled Tribes.",
    rules: { caste: "st", occupation: "student", maxIncome: 250000 }
  },
  {
    id: "stand_up_india",
    name: "Stand-Up India Scheme",
    description: "Bank loans between ₹10 lakh and ₹1 crore for SC, ST, and women entrepreneurs.",
    rules: {
      occupation: "entrepreneur",
      customCheck: (profile) => ["sc", "st"].includes(profile.caste) || profile.gender === "female"
    }
  },
  {
    id: "pm_jan_dhan",
    name: "Pradhan Mantri Jan Dhan Yojana (PMJDY)",
    description: "National mission for financial inclusion providing zero-balance basic savings accounts.",
    rules: {}
  },
  {
    id: "pm_vishwakarma",
    name: "PM Vishwakarma Yojana",
    description: "End-to-end support, skill upgrade, and collateral-free credit for traditional artisans and craftspeople.",
    rules: { occupation: "artisan" }
  }
];

// Wait for DOM to load completely, then attach the event handler
document.addEventListener("DOMContentLoaded", () => {
  const formElement = document.getElementById("eligibility-form");
  
  if (!formElement) return;

  formElement.addEventListener("submit", function (e) {
    e.preventDefault();

    // 1. Gather input values safely via DOM
    const profile = {
      age: parseInt(document.getElementById("age").value) || 0,
      annualIncome: parseFloat(document.getElementById("income").value) || 0,
      state: document.getElementById("state").value,
      occupation: document.getElementById("occupation").value,
      caste: document.getElementById("caste").value,
      gender: document.getElementById("gender").value
    };

    // 2. Filter rules
    const matchedSchemes = schemesData.filter(scheme => {
      const rules = scheme.rules;
      let isValid = true;

      if (rules.minAge !== undefined && profile.age < rules.minAge) isValid = false;
      if (rules.maxAge !== undefined && profile.age > rules.maxAge) isValid = false;
      if (rules.maxIncome !== undefined && profile.annualIncome > rules.maxIncome) isValid = false;
      if (rules.occupation !== undefined && rules.occupation !== profile.occupation) isValid = false;
      if (rules.gender !== undefined && rules.gender !== profile.gender) isValid = false;
      if (rules.caste !== undefined && rules.caste !== profile.caste) isValid = false;
      if (rules.customCheck !== undefined && !rules.customCheck(profile)) isValid = false;

      return isValid;
    });

    // 3. Output results to DOM container
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    if (matchedSchemes.length === 0) {
      container.innerHTML = `<p style="color: #ef4444; font-weight: 600;">No matching schemes found for your profile parameters.</p>`;
      return;
    }

    matchedSchemes.forEach(scheme => {
      container.innerHTML += `
        <div class="scheme-card">
          <h4>${scheme.name}</h4>
          <p>${scheme.description}</p>
        </div>
      `;
    });
  });
});