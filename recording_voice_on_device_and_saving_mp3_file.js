
let mediaRecorder = null;
let isRecording = false;
let audioFile = null;

export function get_audio_file(audioChunks, type){
    const audioBlob = new Blob(audioChunks, { type: type});
    let extension = '';

    if(!audioBlob){
        return;
    }
    const fileName = `recording_${Date.now()}${extension ?? `.${extension}`}`;
    audioFile = new File([audioBlob], fileName, { type: type });
    const audioUrl = URL.createObjectURL(audioBlob);

    if(!document.getElementById('download-link')){
        const a = document.createElement('a');
        a.id = 'download-link';
        a.download = fileName;
        a.href = audioUrl;
        a.textContent = 'download';
        document.body.appendChild(a);
    } else {
        document.getElementById('download-link').href = audioUrl;
        document.getElementById('download-link').download = fileName;
    }
}

export async function startRecording(){
    if(isRecording){
        return;
    }
    const audioChunks = [];
    const typeVariants = [ 'audio/webm', 'audio/mp3'];
    let selectedType = MediaRecorder.isTypeSupported(typeVariants[0]) ? typeVariants[0] : typeVariants[1];
    const frameRate = 100;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder( stream, {
            mimeType: selectedType,
        });

        mediaRecorder.ondataavailable = (event) => {
            if(event.data.size > 0){
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            get_audio_file(audioChunks, selectedType);
            stream.getTracks().forEach( tr => tr.stop());
        }
        mediaRecorder.start(frameRate);
        isRecording = true;
    } catch(e){
        console.error("failed to record", err);
    }
}


export function stopRecording(){
    if(!mediaRecorder || !isRecording){
        return;
    }
    mediaRecorder.stop();
    isRecording = false;
}
