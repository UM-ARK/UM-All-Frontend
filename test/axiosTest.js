import React, {Component} from 'react';
import {View, Text} from 'react-native';

import axios from 'axios';

class Test extends Component {
    constructor() {
        super();

        axios
            .get('https://api.data.um.edu.mo/service/media/news/v1.0.0/all', {
                // 請求頭配置
                headers: {
                    Accept: 'application/json',
                    Authorization:
                        'Bearer 3edfffda-97ce-326a-a0a5-5e876adbf89f',
                },
            })
            .then(res => {
                console.log(res.data._embedded);
            })
            .catch(err => {
                console.error(err);
            })
            .finally(res => console.log('Finally', res));
    }

    render() {
        return (
            <View>
                <Text>Test</Text>
            </View>
        );
    }
}

export default Test;
