import { startRecording, stopRecording, get_audio_file } from "./recording_voice_on_device_and_saving_mp3_file.js";

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');

    startBtn.addEventListener('click', () => {
        startRecording();
    });

    stopBtn.addEventListener('click', () => {
        stopRecording();
    });
})