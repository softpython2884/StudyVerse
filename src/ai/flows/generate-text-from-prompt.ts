'use server';
/**
 * @fileOverview An AI agent that generates or modifies text based on a prompt.
 *
 * - generateTextFromPrompt - A function that generates a detailed response to a prompt, potentially modifying a selection.
 * - GenerateTextFromPromptInput - The input type for the function.
 * - GenerateTextFromPromptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTextFromPromptInputSchema = z.object({
  prompt: z.string().describe('The user instruction.'),
  selection: z.string().optional().describe('The currently selected text (HTML format) to be modified. If empty, generate new content.'),
});
export type GenerateTextFromPromptInput = z.infer<
  typeof GenerateTextFromPromptInputSchema
>;

const GenerateTextFromPromptOutputSchema = z.object({
  response: z
    .string()
    .describe('The generated or modified text, in HTML format.'),
    error: z.string().optional().describe('An error message if the operation failed.'),
});
export type GenerateTextFromPromptOutput = z.infer<
  typeof GenerateTextFromPromptOutputSchema
>;

export async function generateTextFromPrompt(
  input: GenerateTextFromPromptInput
): Promise<GenerateTextFromPromptOutput> {
  return generateTextFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOrEditTextPrompt',
  input: {schema: GenerateTextFromPromptInputSchema},
  output: {schema: GenerateTextFromPromptOutputSchema},
  prompt: `You are an expert writing assistant. Your task is to process a user's prompt and either generate new content or modify existing content.

CRITICAL INSTRUCTIONS:
1.  **Analyze the user's prompt** to understand their intent.
2.  **Check for existing content:**
    -   **If "selection" is provided:** Modify the HTML content in "selection" according to the user's "prompt". PRESERVE the original HTML structure and tags as much as possible, only changing the text content as requested.
    -   **If "selection" is empty:** Generate a new, comprehensive document based on the user's "prompt". Structure the output with appropriate HTML tags (<h1>, <h2>, <p>, <ul>, etc.).
3.  **Output Format:** Your final output MUST be a single, valid JSON object with a "response" field containing the complete, resulting HTML. Do not include any explanations, markdown, or any text outside of the JSON structure.

USER PROMPT:
"{{{prompt}}}"

{{#if selection}}
EXISTING CONTENT TO MODIFY:
\`\`\`html
{{{selection}}}
\`\`\`
{{/if}}
`,
});

const generateTextFromPromptFlow = ai.defineFlow(
  {
    name: 'generateTextFromPromptFlow',
    inputSchema: GenerateTextFromPromptInputSchema,
    outputSchema: GenerateTextFromPromptOutputSchema,
  },
  async input => {
     try {
      const {output} = await prompt(input);
      return output || { response: "" };
    } catch (e: any) {
        console.error("Error in generateTextFromPromptFlow:", e);
        const errorMessage = e.message?.toLowerCase() || '';

        if (errorMessage.includes('503') || errorMessage.includes('model is overloaded')) {
            return { response: "", error: "The AI service is currently overloaded. Please wait a moment and try again." };
        }
        if (errorMessage.includes('429')) {
             return { response: "", error: "You've made too many requests recently. Please wait a bit before trying again." };
        }
        if (errorMessage.includes('safety')) {
            return { response: "", error: "The request was blocked due to safety concerns. Please modify your prompt and try again." };
        }
        if (errorMessage.includes('400')) {
            return { response: "", error: "The request was invalid. Please check your instructions and try again." };
        }

        return { response: "", error: "An unexpected error occurred while generating the text." };
    }
  }
);
