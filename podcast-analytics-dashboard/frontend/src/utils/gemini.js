import axios from 'axios';

// Get API URL from environment variables
const SUMMARY_API_URL = import.meta.env.VITE_SUMMARY_API_URL || 
  'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';

console.log('Using summary API endpoint:', SUMMARY_API_URL);

// Simple fallback summary generator
const generateFallbackSummary = (title, description) => {
  // Create a simple summary from the first few words of the title and description
  const titleSummary = title.split(' ').slice(0, 10).join(' ');
  const descSummary = description.split(' ').slice(0, 30).join(' ');
  return `${titleSummary}: ${descSummary}...`;
};

// Simple fallback for related videos
const generateFallbackRelatedVideos = (title) => {
  return [
    { title: `More about ${title.split(' ').slice(0, 3).join(' ')}`, reason: 'Related topic' },
    { title: 'Popular podcast episodes', reason: 'Trending in similar categories' },
    { title: 'Latest uploads from this channel', reason: 'From the same creator' }
  ];
};

/**
 * Generate a summary of the video/podcast using Hugging Face's Flan-T5 model
 * @param {string} title - The title of the video/podcast
 * @param {string} description - The description of the video/podcast
 * @param {string} transcript - Optional transcript text
 * @returns {Promise<string>} - Generated summary
 */
export const generateSummary = async (title, description, transcript = '') => {
  try {
    // Combine title, description, and transcript for summarization
    const inputText = `${title}. ${description}. ${transcript ? transcript.substring(0, 1000) : ''}`.trim();
    
    console.log('Generating summary for:', inputText.substring(0, 100) + '...');

    try {
      const response = await axios.post(
        SUMMARY_API_URL,
        {
          inputs: inputText,
          parameters: {
            max_length: 130,
            min_length: 30,
            do_sample: false
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 seconds timeout
        }
      );

      // Handle different response formats
      const text = response.data?.[0]?.summary_text || 
                  response.data?.[0]?.generated_text ||
                  (Array.isArray(response.data) && response.data[0]) ||
                  JSON.stringify(response.data);
      
      return text || generateFallbackSummary(title, description);
    } catch (apiError) {
      console.warn('API request failed, using fallback summary:', apiError);
      return generateFallbackSummary(title, description);
    }
  } catch (error) {
    console.error('Error in generateSummary:', error);
    return generateFallbackSummary(title, description);
  }
};

/**
 * Get related video suggestions using Hugging Face's Flan-T5 model
 * @param {string} title - The title of the current video
 * @param {string} channelName - The name of the channel
 * @param {string} description - The description of the video
 * @returns {Promise<Array>} - Array of suggested video objects
 */
export const getRelatedVideos = async (title, channelName, description) => {
  try {
    console.log('Getting related videos for:', title);
    
    // For now, return fallback suggestions since we don't have a reliable API
    // In a production environment, you would want to implement a proper recommendation system
    return generateFallbackRelatedVideos(title);
    
  } catch (error) {
    console.error('Error in getRelatedVideos:', error);
    return generateFallbackRelatedVideos(title);
  }
};
