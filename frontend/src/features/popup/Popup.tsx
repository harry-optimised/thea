import {
  Button,
  TrashIcon,
  CloudUploadIcon,
  MediaIcon,
  FilePicker,
  Spinner,
  Pane,
  Dialog,
} from 'evergreen-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { v4 } from 'uuid';

import { useAppDispatch } from '../../app/hooks';
import { AppDispatch, RootState } from '../../app/store';
import { browserInfo, closeBrowser } from '../browser/browserSlice';
import { LoginState } from '../login/loginSlice';
import { closePopUp } from '../popup/popupSlice';
import { SimpleLabel } from '../../components/Elements/SimpleLabel';
import { fetchCameraInfo, putFile } from './api/index';

import styles from './Popup.module.css';
import { getPopUpCameraID, getPopUpStatus } from './popupSlice';
import { Camera } from '../map/types';

interface WrapperProps {
  onDeleteCamera(id: number): void;
  onOpenBrowser(browserInfo: browserInfo): void;
  login: LoginState;
}

interface DialogProps {
  confirmDelete(): void;
}

function ConfirmDeleteDialog({ confirmDelete }: DialogProps) {
  const [isShown, setIsShown] = React.useState(false);

  return (
    <Pane>
      <Dialog
        isShown={isShown}
        title="Delete Camera"
        intent="danger"
        onCloseComplete={() => setIsShown(false)}
        onConfirm={() => {
          setIsShown(false);
          confirmDelete();
        }}
        confirmLabel="Confirm Delete"
      >
        Are you sure you want to delete this camera? This action cannot be undone.
      </Dialog>

      <Button
        className={styles.button}
        marginRight={12}
        iconBefore={TrashIcon}
        intent="danger"
        onClick={() => {
          setIsShown(true);
        }}
      >
        Delete Camera
      </Button>
    </Pane>
  );
}

const mapStateToProps = (state: RootState, wrapperProps: WrapperProps) => ({
  popUpState: getPopUpStatus(state),
  popUpCameraID: getPopUpCameraID(state),
  ...wrapperProps,
});
const mapDispatchToProps = (dispatch: AppDispatch) => ({
  closePopUp: () => dispatch(closePopUp()),
});
const connector = connect(mapStateToProps, mapDispatchToProps);
type Props = ConnectedProps<typeof connector>;

function Popup({
  popUpState,
  popUpCameraID,
  closePopUp,
  onDeleteCamera,
  onOpenBrowser,
  login,
}: Props) {
  const dispatch = useAppDispatch();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const [toUpload, setToUpload] = useState(0);
  const [popUpInfo, setPopUpInfo] = useState<Camera>({
    id: 0,
    name: '',
    latitude: 0,
    longitude: 0,
    image_count: 0,
  });

  // On Open, Close Browser
  // This effect listens for changes in popUpState, and triggers when it's open, therefore
  // it triggers when the PopUp opens. It dispatches an action to close the browser so that
  // they are not both on the screen at the same time.
  useEffect(() => {
    if (popUpState) {
      dispatch(closeBrowser());
    }
  }, [popUpState, dispatch]);

  const onFileUpload = useCallback(() => {
    if (files !== null) {
      setUploaded(0);
      setToUpload(files.length);
      for (let i = 0; i < files.length; i++) {
        // Create the UUID name.
        const re = /(?:\.([^.]+))?$/;
        const result = re.exec(files[i].name);
        if (result !== null) {
          const uuid_name = v4().toString() + result[0].toString();

          putFile(login, files[i], popUpCameraID, uuid_name).then(() =>
            setUploaded((uploaded) => uploaded + 1)
          );
        }
      }
      setPopUpInfo((prevState) => {
        return { ...prevState, image_count: files.length + prevState.image_count };
      });
    }
  }, [login, files, popUpCameraID]);

  // Grab Camera Info
  // This uses the ID in state to fetch the camera data from the backend and populate that
  // UI.
  useEffect(() => {
    // If popUpInfo.id is 0 then it's not initialised yet.
    if (popUpCameraID === 0) return;

    fetchCameraInfo(login, popUpCameraID).then((data) => setPopUpInfo(data));
  }, [login, popUpCameraID, files]);

  return (
    <div>
      {popUpState ? (
        <div className={styles.containerBackground}>
          <div className={styles.container}>
            <div className={styles.header}>
              <h3 className={styles.title}>{popUpInfo.name}</h3>
              <h3 onClick={() => closePopUp()} className={styles.cancel}>
                ✕
              </h3>
            </div>
            <div className={styles.body}>
              <SimpleLabel label="Latitude" value={popUpInfo.latitude.toString()} />
              <SimpleLabel label="Longitude" value={popUpInfo.longitude.toString()} />
              <SimpleLabel label="Images" value={popUpInfo.image_count.toString()} />
            </div>
            <div className={styles.body}>
              <h3>Upload images to this camera</h3>
              <div style={{ display: 'flex' }}>
                <FilePicker
                  className={styles.button}
                  multiple
                  width={300}
                  marginRight={12}
                  onChange={(files) => setFiles(files)}
                  placeholder="Upload Images"
                />
                <Button
                  className={styles.button}
                  data-name="upload-images"
                  marginRight={12}
                  iconBefore={CloudUploadIcon}
                  intent="none"
                  onClick={onFileUpload}
                >
                  Upload
                </Button>
              </div>
              {toUpload !== uploaded ? (
                <div style={{ display: 'flex', paddingTop: '20px' }}>
                  <Spinner size={16} marginRight={12} />
                  <SimpleLabel
                    label="Uploaded"
                    value={`${Math.round((uploaded / toUpload) * 100)}%`}
                  />
                </div>
              ) : null}
            </div>
            <div className={styles.footer}>
              <ConfirmDeleteDialog
                confirmDelete={() => {
                  closePopUp();
                  onDeleteCamera(popUpCameraID);
                }}
              />
              <Button
                className={styles.button}
                marginRight={16}
                intent="none"
                iconBefore={MediaIcon}
                disabled={popUpInfo.image_count === 0}
                onClick={() => {
                  closePopUp();
                  onOpenBrowser({
                    id: popUpCameraID,
                    name: popUpInfo.name,
                  });
                }}
              >
                Browse Images
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default connector(Popup);
