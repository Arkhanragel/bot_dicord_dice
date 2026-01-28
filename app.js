import * as fs from 'node:fs';
import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};
const DICE_BUTTON_ID = 'dice_roll_button';
const D6_BUTTON_ID = 'd6_roll_button';
const D4_BUTTON_ID = 'd4_roll_button';

function rollD21() {
  return Math.floor(Math.random() * 20) + 1;
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollD4() {
  return Math.floor(Math.random() * 4) + 1;
}

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }
    if (name === 'd20') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 'Lanza un dado maldito de 20 caras.',
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: DICE_BUTTON_ID,
                  label: 'Lanzar',
                  emoji: { name: '🎲' },
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
    if (name === 'd6') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 'Lanza un dado de 6 caras.',
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: D6_BUTTON_ID,
                  label: 'Lanzar',
                  emoji: { name: '🎲' },
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
    if (name === 'd4') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 'Lanza un dado de 4 caras.',
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: D4_BUTTON_ID,
                  label: 'Lanzar',
                  emoji: { name: '🎲' },
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }
if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;

    if (componentId === DICE_BUTTON_ID) {
      const roll = rollD21();
      const imagePath = `./assets/${roll}.jpg`;

      // First, send a deferred response
      res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });

      // Then send the follow-up with the image attachment
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}`;
try {
        // Check if image exists, fallback to placeholder
        let imageBuffer;
        let fileName = `${roll}.jpg`;

        if (fs.existsSync(imagePath)) {
          imageBuffer = fs.readFileSync(imagePath);
        } else {
          // Fallback: fetch from placeholder service if local file doesn't exist
          const placeholderUrl = `https://placehold.co/512x512/111827/38bdf8.png?text=D21%0A${roll}&font=source-sans-pro`;
          const response = await fetch(placeholderUrl);
          imageBuffer = Buffer.from(await response.arrayBuffer());
        }

        // Create form data with the image
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpg' });
        formData.append('files[0]', blob, fileName);
        formData.append('payload_json', JSON.stringify({
          content: `🎲 Resultado: **${roll}**`,
          embeds: [
            {
              title: `D20: ${roll}`,
              image: { url: `attachment://${fileName}` },
              color: 0x38bdf8,
            },
          ],
        }));

        // Send via webhook
        const url = `https://discord.com/api/v10/${endpoint}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
          body: formData,
        });
      } catch (err) {
        console.error('Error sending dice image:', err);
      }

      return;
    }

    if (componentId === D6_BUTTON_ID) {
      const roll = rollD6();
      const imagePath = `./assets/d6/${roll}.jpg`;

      // First, send a deferred response
      res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });

      // Then send the follow-up with the image attachment
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}`;
      try {
        // Check if image exists, fallback to placeholder
        let imageBuffer;
        let fileName = `${roll}.jpg`;

        if (fs.existsSync(imagePath)) {
          imageBuffer = fs.readFileSync(imagePath);
        } else {
          // Fallback: fetch from placeholder service if local file doesn't exist
          const placeholderUrl = `https://placehold.co/512x512/111827/38bdf8.png?text=D6%0A${roll}&font=source-sans-pro`;
          const response = await fetch(placeholderUrl);
          imageBuffer = Buffer.from(await response.arrayBuffer());
        }

        // Create form data with the image
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpg' });
        formData.append('files[0]', blob, fileName);
        formData.append('payload_json', JSON.stringify({
          content: `🎲 Resultado: **${roll}**`,
          embeds: [
            {
              title: `D6: ${roll}`,
              image: { url: `attachment://${fileName}` },
              color: 0x38bdf8,
            },
          ],
        }));

        // Send via webhook
        const url = `https://discord.com/api/v10/${endpoint}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
          body: formData,
        });
      } catch (err) {
        console.error('Error sending d6 image:', err);
      }

      return;
    }

    if (componentId === D4_BUTTON_ID) {
      const roll = rollD4();
      const imagePath = `./assets/d4/${roll}.jpg`;

      // First, send a deferred response
      res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });

      // Then send the follow-up with the image attachment
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}`;
      try {
        // Check if image exists, fallback to placeholder
        let imageBuffer;
        let fileName = `${roll}.jpg`;

        if (fs.existsSync(imagePath)) {
          imageBuffer = fs.readFileSync(imagePath);
        } else {
          // Fallback: fetch from placeholder service if local file doesn't exist
          const placeholderUrl = `https://placehold.co/512x512/111827/38bdf8.png?text=D4%0A${roll}&font=source-sans-pro`;
          const response = await fetch(placeholderUrl);
          imageBuffer = Buffer.from(await response.arrayBuffer());
        }

        // Create form data with the image
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpg' });
        formData.append('files[0]', blob, fileName);
        formData.append('payload_json', JSON.stringify({
          content: `🎲 Resultado: **${roll}**`,
          embeds: [
            {
              title: `D4: ${roll}`,
              image: { url: `attachment://${fileName}` },
              color: 0x38bdf8,
            },
          ],
        }));

        // Send via webhook
        const url = `https://discord.com/api/v10/${endpoint}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
          body: formData,
        });
      } catch (err) {
        console.error('Error sending d4 image:', err);
      }

      return;
    }
  }
  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
