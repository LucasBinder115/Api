export async function generateQuestions(prompt) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
    });
    return await response.json();
}