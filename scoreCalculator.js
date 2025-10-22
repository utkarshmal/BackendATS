// ATS resume/backend/scoreCalculator.js

function cleanAndTokenize(text) {
    const textLower = text.toLowerCase();
    
    // Explicitly handle C++ to prevent token loss
    let cleanedText = textLower.replace(/c\+\+/g, 'cpp'); 
    
    // Handle 'VS Code' patterns
    cleanedText = cleanedText.replace(/visual\s+studio\s+code/g, 'vscode');
    cleanedText = cleanedText.replace(/vs\s*[-\.]?\s*code/g, 'vscode');
    
    // Remove punctuation, but keep space and dot (for node.js)
    cleanedText = cleanedText.replace(/[^a-z0-9\s.]/g, ' '); 
    
    const stopwords = new Set(['the', 'a', 'is', 'and', 'or', 'to', 'in', 'of', 'for', 'with', 'i', 'me', 'my', 'at', 'on', 'as', 'so', 'was', 'were', 'by', 'from', 'in', 'an']);
    
    return new Set(cleanedText.split(/\s+/)
        .filter(word => word.length > 2 && !stopwords.has(word)));
}

function checkSectionPresence(resumeText) {
    const textLower = resumeText.toLowerCase();
    // Sections derived from your resume
    const requiredSections = [
        "academic details",
        "internship/experience",
        "projects",
        "achievements",
        "skills",
        "extracurricular"
    ];
    
    let sectionsFound = 0;
    requiredSections.forEach(section => {
        if (textLower.includes(section.toLowerCase())) {
            sectionsFound++;
        }
    });
    
    return (sectionsFound / requiredSections.length); // Returns a ratio (0.0 to 1.0)
}

function calculateATSScore(resumeText) {
    const uniqueTokens = cleanAndTokenize(resumeText);

    // --- PARAMETER 1: TECHNICAL KEYWORD MATCH ---
    // Total Keywords: 20
    const techKeywords = [
        "mern", "fullstack", 
        "javascript", "typescript", "node.js", "express", "react", "redux", "hooks", 
        "mongodb", "sql", "git", "github", "docker", "cpp", 
        "css", "nptel", "tailwind", "rest api", "html"
    ];

    let matchedKeywords = [];
    const techKeywordsForCheck = techKeywords.map(k => k.toLowerCase());

    techKeywordsForCheck.forEach(k => {
        // Checking for token match (e.g., 'node.js', 'cpp', 'css')
        if (uniqueTokens.has(k.replace('.', ''))) { // nodejs is checked as 'nodejs'
             matchedKeywords.push(k);
        } else if (uniqueTokens.has(k)) {
             matchedKeywords.push(k);
        }
    });
    
    // Remove duplicates
    matchedKeywords = [...new Set(matchedKeywords)];

    const keywordRatio = matchedKeywords.length / techKeywords.length; // 0.0 to 1.0

    // --- PARAMETER 2: SECTION/FORMATTING SCORE ---
    const sectionRatio = checkSectionPresence(resumeText); // 0.0 to 1.0

    // --- OVERALL SCORE CALCULATION (80% Keywords + 20% Sections) ---
    const overallScore = (keywordRatio * 80) + (sectionRatio * 20);
    
    // Translate 'cpp' back to 'C++' for display
    const finalMatchedKeywords = matchedKeywords.map(k => k === 'cpp' ? 'C++' : k);
    
    const missingKeywords = techKeywords.filter(k => !finalMatchedKeywords.includes(k));


    return {
        score: Math.min(100, overallScore).toFixed(2),
        matchedKeywords: finalMatchedKeywords,
        missingKeywords: missingKeywords
    };
}

module.exports = { calculateATSScore }; // ✅ FIX: CJS exportcd 