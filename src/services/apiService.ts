import OpenAI from 'openai';
import axios from 'axios';
import { ChatGPTRecognitionResponse, PerplexitySearchResponse, Cigar } from '../types';
import { getStrengthInfo } from '../utils/strengthUtils';
import { StrengthLevel } from '../utils/strengthUtils';
import { 
  CIGAR_RECOGNITION_SYSTEM_PROMPT, 
  CIGAR_RECOGNITION_EXAMPLES,
  CIGAR_SEARCH_SYSTEM_PROMPT,
  CIGAR_SEARCH_EXAMPLES,
  MANUAL_ENTRY_SYSTEM_PROMPT,
  RECOMMENDATION_SYSTEM_PROMPT,
  RECOMMENDATION_EXAMPLES
} from './prompts';

// Configuration - API Keys from environment variables
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const PERPLEXITY_API_KEY = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY || '';
const DEBUG_API_CALLS = process.env.DEBUG_API_CALLS === 'true';

// Validate API keys on startup
if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not found. Image recognition will not work.');
  console.warn('📝 Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file');
}

if (!PERPLEXITY_API_KEY) {
  console.warn('⚠️ PERPLEXITY_API_KEY not found. Detailed search will not work.');
  console.warn('📝 Please add EXPO_PUBLIC_PERPLEXITY_API_KEY to your .env file');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export enum RecognitionMode {
  HYBRID = 'hybrid',           // ChatGPT Vision + Perplexity (default)
  BUDGET = 'budget',           // ChatGPT Vision only
  MANUAL = 'manual',           // Manual entry + Perplexity
  PERPLEXITY_ONLY = 'perplexity_only' // Perplexity with user description
}

export class APIService {
  /**
   * Use ChatGPT to recognize a cigar from an image with enhanced analysis
   */
  static async recognizeCigarFromImage(imageUri: string): Promise<ChatGPTRecognitionResponse> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
    }

    try {
      if (DEBUG_API_CALLS) {
        console.log('🔍 Starting OpenAI Vision API call...');
      }
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: CIGAR_RECOGNITION_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this cigar image and provide identification details in the specified JSON format."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUri,
                },
              },
            ],
          },
        ],
        max_tokens: 700,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from ChatGPT');
      }

      // Extract JSON from the response (handle markdown code blocks)
      let jsonString = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      if (DEBUG_API_CALLS) {
        console.log('🔍 Raw ChatGPT response:', content);
        console.log('🔍 Extracted JSON:', jsonString);
      }

      return JSON.parse(jsonString) as ChatGPTRecognitionResponse;
    } catch (error: any) {
      console.error('Error recognizing cigar:', error);
      
      // Preserve original error context
      if (error?.message) {
        throw new Error(error.message);
      }
      throw new Error('Failed to recognize cigar from image');
    }
  }

  /**
   * Use Perplexity to search for comprehensive cigar information
   */
  static async searchCigarDetails(brand: string, line?: string, name?: string, size?: string): Promise<PerplexitySearchResponse> {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured. Please add EXPO_PUBLIC_PERPLEXITY_API_KEY to your .env file.');
    }

    try {
      if (DEBUG_API_CALLS) {
        console.log('📚 Starting Perplexity API call...');
        console.log('📚 Search query:', [brand, line, name, size].filter(Boolean).join(' '));
      }
      const searchQuery = [brand, line, name, size].filter(Boolean).join(' ');
      
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'user',
              content: `Research comprehensive information about this cigar: "${searchQuery}". ${CIGAR_SEARCH_SYSTEM_PROMPT}\n\nProvide detailed data in the specified JSON format.`
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Perplexity');
      }

      // Extract JSON from the response (handle markdown code blocks)
      let jsonString = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      if (DEBUG_API_CALLS) {
        console.log('🔍 Raw Perplexity response:', content);
        console.log('🔍 Extracted JSON:', jsonString);
      }

      return JSON.parse(jsonString) as PerplexitySearchResponse;
    } catch (error) {
      console.error('Error searching cigar details:', error);
      if (error.response) {
        console.error('Perplexity API error response:', JSON.stringify(error.response.data, null, 2));
        console.error('Perplexity API error status:', error.response.status);
        console.error('Perplexity API error headers:', error.response.headers);
      }
      throw new Error('Failed to fetch cigar details');
    }
  }

  /**
   * Search for cigar information using manual entry (no image)
   */
  static async searchCigarByManualEntry(
    brand: string,
    line?: string,
    name?: string,
    size?: string,
    userDescription?: string
  ): Promise<PerplexitySearchResponse> {
    try {
      const searchQuery = [brand, line, name, size].filter(Boolean).join(' ');
      const enhancedQuery = userDescription 
        ? `${searchQuery} - User notes: ${userDescription}`
        : searchQuery;

      console.log('🔍 Manual search for:', enhancedQuery);
      
      return await this.searchCigarDetails(brand, line, name, size);
    } catch (error) {
      console.error('Error in manual cigar search:', error);
      throw new Error('Failed to find cigar information');
    }
  }

  /**
   * Search for cigar information using user description only
   */
  static async searchCigarByDescription(
    userDescription: string
  ): Promise<PerplexitySearchResponse> {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured. Please add EXPO_PUBLIC_PERPLEXITY_API_KEY to your .env file.');
    }

    try {
      console.log('🔍 Description-based search for:', userDescription);
      
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'user',
              content: `Based on this description, identify the cigar and provide comprehensive information: "${userDescription}". ${CIGAR_SEARCH_SYSTEM_PROMPT}\n\nProvide detailed data in the specified JSON format.`
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Perplexity');
      }

      // Parse the JSON response
      let cigarData;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cigarData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse Perplexity response:', content);
        throw new Error('Failed to parse cigar information');
      }

      return {
        cigar: cigarData,
        confidence: 0.8, // High confidence for description-based search
        sources: ['Perplexity AI Search'],
      };
    } catch (error) {
      console.error('Error in description-based cigar search:', error);
      throw new Error('Failed to find cigar information');
    }
  }

  /**
   * ChatGPT-only recognition (budget mode)
   */
  static async recognizeCigarBudgetMode(imageUri: string): Promise<{
    recognition: ChatGPTRecognitionResponse;
    enrichedCigar: Partial<Cigar>;
    confidence: number;
  }> {
    try {
      console.log('💰 Using budget mode (ChatGPT only)...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert cigar sommelier. Analyze this cigar image and provide comprehensive information based on your training data.

                IDENTIFICATION & ANALYSIS:
                - Identify brand, line, specific name, and vitola size
                - Analyze wrapper color, texture, and construction
                - Provide strength level and flavor profile
                - Include tobacco origins and composition if known
                - Add smoking experience and tasting notes
                - Estimate MSRP and provide any known ratings

                IMPORTANT: Use only your training knowledge. Be honest about confidence levels.

                Respond in JSON format:
                {
                  "brand": "brand name or null",
                  "line": "product line or null",
                  "name": "specific name or null",
                  "size": "vitola size or null",
                  "wrapper": "wrapper type and origin or null",
                  "filler": "filler blend or null",
                  "binder": "binder type or null",
                  "strength": "Mild|Medium|Strong or null",
                  "flavorProfile": ["flavor1", "flavor2"] or [],
                  "tobaccoOrigins": ["country1", "country2"] or [],
                  "smokingExperience": {
                    "first": "first third or null",
                    "second": "second third or null",
                    "final": "final third or null"
                  },
                  "msrp": "estimated price or null",
                  "professionalRating": "known rating or null",
                  "wrapperColor": "wrapper color",
                  "confidence": confidence_score_0_to_100,
                  "reasoning": "detailed explanation",
                  "identifyingFeatures": ["feature1", "feature2"],
                  "dataSource": "training_data_only"
                }`
              },
              {
                type: "image_url",
                image_url: { url: imageUri },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from ChatGPT');
      }

      // Extract JSON from the response (handle markdown code blocks)
      let jsonString = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      const result = JSON.parse(jsonString);
      
      const recognition: ChatGPTRecognitionResponse = {
        brand: result.brand,
        line: result.line,
        name: result.name,
        size: result.size,
        wrapperColor: result.wrapperColor,
        confidence: result.confidence,
        reasoning: result.reasoning,
        identifyingFeatures: result.identifyingFeatures,
      };

      const enrichedCigar: Partial<Cigar> = {
        ...result,
        id: '', // Will be set later
        imageUrl: imageUri,
        recognitionConfidence: result.confidence,
      };

      console.log(`💰 Budget mode complete. Confidence: ${result.confidence}%`);

      return {
        recognition,
        enrichedCigar,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Error in budget mode recognition:', error);
      throw new Error('Failed to recognize cigar in budget mode');
    }
  }

  /**
   * Complete cigar identification and data enrichment pipeline
   */
  static async identifyAndEnrichCigar(imageUri: string): Promise<{
    recognition: ChatGPTRecognitionResponse;
    details: PerplexitySearchResponse | null;
    enrichedCigar: Partial<Cigar>;
    confidence: number;
  }> {
    try {
      // Step 1: Recognize cigar from image
      console.log('🔍 Starting cigar recognition...');
      const recognition = await this.recognizeCigarFromImage(imageUri);
      
      let details: PerplexitySearchResponse | null = null;
      let enrichedCigar: Partial<Cigar> = {
        brand: recognition.brand || 'Unknown Brand',
        line: recognition.line || 'Unknown Line',
        name: recognition.name || 'Unknown Name',
        size: recognition.size || 'Unknown Size',
        wrapperColor: recognition.wrapperColor,
        identifyingFeatures: recognition.identifyingFeatures,
        recognitionConfidence: recognition.confidence,
        imageUrl: imageUri,
      };

      // Step 2: If recognition confidence is reasonable, search for detailed info
      if (recognition.confidence >= 30 && recognition.brand) {
        console.log('📚 Searching for detailed cigar information...');
        try {
          details = await this.searchCigarDetails(
            recognition.brand,
            recognition.line,
            recognition.name,
            recognition.size
          );

          // Merge detailed information
          if (details) {
          if (DEBUG_API_CALLS) {
            console.log('📚 Perplexity details received:', JSON.stringify(details, null, 2));
            console.log('📚 FlavorTags:', details.flavorTags);
            console.log('📚 FlavorProfile:', details.flavorProfile);
            console.log('📚 MSRP:', details.msrp);
            console.log('📚 SingleStickPrice:', details.singleStickPrice);
          }
            // Helper function to clean reference numbers from text
            const cleanText = (text: string | undefined): string | undefined => {
              if (!text) return text;
              return text.replace(/\[\d+\]/g, '').trim();
            };

            enrichedCigar = {
              ...enrichedCigar,
              // Map Perplexity response to Cigar fields
              brand: details.brand || enrichedCigar.brand,
              line: details.line || enrichedCigar.line,
              name: details.name || enrichedCigar.name,
              size: details.size || enrichedCigar.size,
              wrapper: cleanText(details.wrapper) || enrichedCigar.wrapper,
              filler: cleanText(details.filler) || enrichedCigar.filler,
              binder: cleanText(details.binder) || enrichedCigar.binder,
              tobacco: cleanText(details.tobacco) || enrichedCigar.tobacco,
              strength: getStrengthInfo(details.strength || enrichedCigar.strength).level,
              msrp: details.msrp || enrichedCigar.msrp,
              singleStickPrice: details.singleStickPrice || enrichedCigar.singleStickPrice,
              releaseYear: details.releaseYear || enrichedCigar.releaseYear,
              limitedEdition: details.limitedEdition || enrichedCigar.limitedEdition,
              agingPotential: cleanText(details.agingPotential) || enrichedCigar.agingPotential,
              wrapperColor: cleanText(details.wrapperColor) || enrichedCigar.wrapperColor,
              // New fields from Perplexity
              overview: cleanText(details.overview),
              tobaccoOrigin: cleanText(details.tobaccoOrigin),
              flavorProfile: details.flavorTags || [], // Map flavorTags to flavorProfile for compatibility
              flavorTags: details.flavorTags || [],
              cigarAficionadoRating: details.cigarAficionadoRating,
              // Keep recognition data for reference
              recognitionConfidence: recognition.confidence,
              identifyingFeatures: recognition.identifyingFeatures,
              imageUrl: imageUri,
            };
          } else {
            if (DEBUG_API_CALLS) {
              console.log('📚 No cigar data found in Perplexity response:', details);
            }
          }
        } catch (detailsError) {
          console.warn('⚠️ Failed to fetch detailed information:', detailsError);
          // Continue with basic recognition data
        }
      }

      // Calculate overall confidence
      const overallConfidence = details 
        ? Math.round((recognition.confidence + (details.confidence || 70)) / 2)
        : recognition.confidence;

      console.log(`✅ Cigar identification complete. Confidence: ${overallConfidence}%`);
      
      if (DEBUG_API_CALLS) {
        console.log('📊 Final enriched cigar data:', JSON.stringify(enrichedCigar, null, 2));
      }

      return {
        recognition,
        details,
        enrichedCigar,
        confidence: overallConfidence,
      };
    } catch (error) {
      console.error('❌ Error in cigar identification pipeline:', error);
      throw new Error('Failed to identify and enrich cigar data');
    }
  }

  /**
   * Master cigar recognition method - handles all recognition modes
   */
  static async recognizeCigar(
    mode: RecognitionMode,
    options: {
      imageUri?: string;
      brand?: string;
      line?: string;
      name?: string;
      size?: string;
      userDescription?: string;
    }
  ): Promise<{
    recognition?: ChatGPTRecognitionResponse;
    details?: PerplexitySearchResponse;
    enrichedCigar: Partial<Cigar>;
    confidence: number;
    mode: RecognitionMode;
    sources: string[];
  }> {
    try {
      console.log(`🚀 Starting cigar recognition in ${mode} mode...`);

      switch (mode) {
        case RecognitionMode.HYBRID: {
          if (!options.imageUri) throw new Error('Image required for hybrid mode');
          
          const result = await this.identifyAndEnrichCigar(options.imageUri);
          return {
            recognition: result.recognition,
            details: result.details,
            enrichedCigar: result.enrichedCigar,
            confidence: result.confidence,
            mode,
            sources: result.details?.sources || [],
          };
        }

        case RecognitionMode.BUDGET: {
          if (!options.imageUri) throw new Error('Image required for budget mode');
          
          const result = await this.recognizeCigarBudgetMode(options.imageUri);
          return {
            recognition: result.recognition,
            enrichedCigar: result.enrichedCigar,
            confidence: result.confidence,
            mode,
            sources: ['ChatGPT Training Data'],
          };
        }

        case RecognitionMode.MANUAL: {
          if (!options.brand) throw new Error('Brand required for manual mode');
          
          const details = await this.searchCigarByManualEntry(
            options.brand,
            options.line,
            options.name,
            options.size,
            options.userDescription
          );

          const enrichedCigar: Partial<Cigar> = {
            id: '',
            brand: options.brand,
            line: options.line || 'Unknown Line',
            name: options.name || 'Unknown Name',
            size: options.size || 'Unknown Size',
            ...details.cigar,
            imageUrl: options.imageUri,
          };

          return {
            details,
            enrichedCigar,
            confidence: details.confidence,
            mode,
            sources: details.sources,
          };
        }

        case RecognitionMode.PERPLEXITY_ONLY: {
          if (!options.userDescription) throw new Error('User description required for perplexity-only mode');
          
          const details = await this.searchCigarByDescription(options.userDescription);
          
          const enrichedCigar: Partial<Cigar> = {
            id: '',
            brand: details.cigar.brand || 'Unknown',
            line: details.cigar.line || 'Unknown Line',
            name: details.cigar.name || 'Unknown Name',
            size: details.cigar.size || 'Unknown Size',
            wrapper: details.cigar.wrapper || 'Unknown',
            filler: details.cigar.filler || 'Unknown',
            binder: details.cigar.binder || 'Unknown',
            tobacco: details.cigar.tobacco || 'Unknown',
            strength: getStrengthInfo(details.cigar.strength || 'Medium').level,
            flavorProfile: details.cigar.flavorProfile || [],
            tobaccoOrigins: details.cigar.tobaccoOrigins || [],
            smokingExperience: details.cigar.smokingExperience || {
              first: '',
              second: '',
              final: '',
            },
            overview: details.cigar.overview || '',
            tobaccoOrigin: details.cigar.tobaccoOrigin || '',
            flavorTags: details.cigar.flavorTags || [],
            cigarAficionadoRating: details.cigar.cigarAficionadoRating || 0,
          };

          return {
            details,
            enrichedCigar,
            confidence: details.confidence,
            mode,
            sources: details.sources,
          };
        }

        default:
          throw new Error(`Unknown recognition mode: ${mode}`);
      }
    } catch (error: any) {
      console.error(`❌ Error in ${mode} recognition:`, error);
      
      // Preserve original error context for better debugging
      if (error?.message) {
        throw new Error(error.message);
      }
      throw new Error('Failed to identify and enrich cigar data');
    }
  }

  /**
   * Generate personalized cigar recommendations based on user preferences
   */
  static async generateRecommendations(
    userPreferences: any,
    journalEntries: any[]
  ): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: `Based on these user preferences and smoking history, recommend 5 cigars:
            
            Preferences: ${JSON.stringify(userPreferences)}
            Recent Journal Entries: ${JSON.stringify(journalEntries.slice(-10))}
            
            Provide recommendations as an array of cigar names with brief explanations.
            Focus on cigars that match their flavor preferences and strength levels.
            
            Respond in JSON format:
            ["Recommendation 1: Brand Line - Reason", "Recommendation 2: Brand Line - Reason", ...]`
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from ChatGPT');
      }

      // Extract JSON from the response (handle markdown code blocks)
      let jsonString = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON array in the response
      const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      return JSON.parse(jsonString) as string[];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }
}
