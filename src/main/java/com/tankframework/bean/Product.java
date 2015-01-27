package com.tankframework.bean;

import java.io.Serializable;
import java.util.List;

public class Product implements Serializable {

    private String code;
    private String type;
    private List<String> types;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<String> getTypes() {
        return types;
    }

    public void setTypes(List<String> types) {
        this.types = types;
    }
}
