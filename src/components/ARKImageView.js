import { useState, forwardRef, useImperativeHandle } from "react";

import {
    View,
    Text,
} from 'react-native';
import ImageView from "react-native-image-viewing";

/**
 * ARK ALL 內部自定義全局圖片查看器。
 * @prop {{uri: string}[]} imageUrls 
 */
const ARKImageView = forwardRef((props, ref) => {

    const { imageUrls } = props;
    const [visible, setVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    const onRequireOpen = (index = 0) => {
        setStartIndex(index);
        setVisible(true);
    };

    // 把內部函數暴露給父組件供其調用
    useImperativeHandle(ref, () => ({
        onRequireOpen
    }));

    return (
        <ImageView
            images={imageUrls}
            imageIndex={startIndex}
            visible={visible}
            onRequestClose={() => { setVisible(false); }}
            presentationStyle='overFullScreen'
            FooterComponent={({ imageIndex }) => (
                <View style={{
                    width: "100%",
                    padding: 20
                }}>
                    <Text style={{
                        textAlign: "center",
                        color: 'white',
                        fontSize: 18
                    }}>
                        {imageIndex + 1} / {imageUrls.length}
                    </Text>
                </View>
            )} />
    );
});

export default ARKImageView;

// export default function ARKImageView(props) {
//     const { imageUrls } = props;

//     const [visible, setVisible] = useState(false);

//     const onRequireOpen = () => {
//         setVisible(true);
//     };


// }