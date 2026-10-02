import { useStore } from '../context/Store';
import ScreenSignature from './ScreenSignature';

export default function TrainerSignature() {
  const { data, session, saveTrainerSignature } = useStore();
  const me = data.users.find((user) => user.nationalId === session?.nationalId);
  return (
    <ScreenSignature
      title="توقيع المدرب / المدربة"
      signature={me?.signature || ''}
      previewAlt="توقيع المدرب أو المدربة"
      onSave={saveTrainerSignature}
      onDelete={() => saveTrainerSignature('')}
    />
  );
}
